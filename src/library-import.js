'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { buildIndex, canonicalUrl, noteFacts, youtubeSourceRecords } = require('./indexer');
const { CORE_SHOWS, PRIORITY_SHOWS, extractEntities, sameSourceIdentity, stripInvisibleUnicode } = require('./intelligence');
const { APP_DIR, DEFAULT_DB_PATH, openDatabase, migrateDatabase, verifyDatabase, sha256 } = require('./library-database');
const { LibraryRepository } = require('./library-repository');

const LIBRARY_GATE_VERSION = 'library-ready-v2';
const DEFAULT_SINCE = '2026-07-01';
const DEFAULT_RADAR_ROOT = '[podcast-archive]';
const DEFAULT_QUERIES_ROOT = '[local]/wiki/queries';
const DEFAULT_RAW_REPORTS_ROOT = '[local]/wiki/raw/reports';
const DEFAULT_REPORTS_DIR = path.join(APP_DIR, 'data', 'reports');
const PLACEHOLDER = /(?:^|\n)\s*(?:暂无|尚未|未提供|待补充|待完善|占位|placeholder|not available|n\/?a)(?:\s|[：:。.！!-]|$)|(?:fetch|generation|抓取|生成).{0,28}(?:failed|error|失败)/i;
const NOTE_MIN_CHARS = 800;

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}
function exists(file) { try { return fs.statSync(file).isFile(); } catch (_) { return false; } }
function walk(root, predicate = () => true) {
  const found = [];
  if (!fs.existsSync(root)) return found;
  const pending = [root];
  while (pending.length) {
    const directory = pending.pop();
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch (_) { continue; }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(file);
      else if (entry.isFile() && predicate(file)) found.push(file);
    }
  }
  return found.sort();
}
function stableId(prefix, value) { return `${prefix}_${crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 20)}`; }
function normalizeText(value) {
  return stripInvisibleUnicode(value).toLocaleLowerCase().replace(/&amp;/g, ' and ').replace(/[’‘]/g, "'")
    .replace(/\b(?:podcast|episode|ep)\b/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function slugify(value) { return normalizeText(value).replace(/\s+/g, '-').slice(0, 90) || stableId('show', value).slice(5); }
function decodeXml(value) {
  return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function xmlTag(block, name) {
  const escaped = name.replace(':', '\\:');
  const match = String(block).match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}
function xmlAttr(block, tag, attr) {
  const escaped = tag.replace(':', '\\:');
  const match = String(block).match(new RegExp(`<${escaped}\\b[^>]*\\b${attr}=(?:"([^"]*)"|'([^']*)')[^>]*>`, 'i'));
  return decodeXml(match?.[1] || match?.[2] || '');
}
function durationSeconds(value) {
  const text = String(value || '').trim();
  if (/^\d+$/.test(text)) return Number(text);
  const parts = text.split(':').map(Number);
  if (!parts.length || parts.some(number => !Number.isFinite(number))) return null;
  return parts.reduce((sum, number) => sum * 60 + number, 0);
}
function episodeNumber(value) {
  const match = String(value || '').match(/(?:\bEP(?:ISODE)?\s*[.#:-]?\s*|\[\s*Invest Like the Best\s*,\s*EP\.?\s*)(\d{1,5})/i);
  return match ? match[1] : '';
}
function youtubeId(value) {
  const match = String(value || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/))([\w-]{6,})/i);
  return match ? match[1] : '';
}
function cleanUrl(value) {
  try {
    const url = new URL(String(value || ''));
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_.+|ref|source|si|t|fbclid|gclid|mc_cid|mc_eid|dest-id)$/i.test(key)) url.searchParams.delete(key);
    url.hostname = url.hostname.toLocaleLowerCase();
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch (_) { return ''; }
}
function published(value) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return { at: null, date: null };
  return { at: date.toISOString(), date: date.toISOString().slice(0, 10) };
}
function parseRss(xml) {
  const source = String(xml || '');
  const channelStart = source.match(/<channel\b[^>]*>([\s\S]*)/i)?.[1] || source;
  const firstItem = channelStart.search(/<item\b/i);
  const channelHeader = firstItem >= 0 ? channelStart.slice(0, firstItem) : channelStart;
  const title = xmlTag(channelHeader, 'title');
  const items = [...source.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(match => {
    const block = match[1];
    const duration = xmlTag(block, 'itunes:duration') || xmlTag(block, 'duration');
    const link = xmlTag(block, 'link');
    const enclosureUrl = xmlAttr(block, 'enclosure', 'url');
    const itemTitle = xmlTag(block, 'title');
    return {
      title: itemTitle,
      link,
      description: xmlTag(block, 'description') || xmlTag(block, 'content:encoded') || xmlTag(block, 'itunes:summary'),
      publishedAt: xmlTag(block, 'pubDate') || xmlTag(block, 'published') || xmlTag(block, 'updated'),
      guid: xmlTag(block, 'guid'),
      // Branded episode numbers in the official title are canonical. Some archived
      // feeds renumbered the iTunes sequence while retaining the stable EP number.
      episodeNumber: episodeNumber(itemTitle) || xmlTag(block, 'itunes:episode'),
      durationText: duration,
      durationSeconds: durationSeconds(duration),
      enclosureUrl,
      enclosureType: xmlAttr(block, 'enclosure', 'type'),
    };
  });
  return { title, items };
}

function stripMarkdown(value) {
  return String(value || '').replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]+)`/g, '$1').replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]+>/g, ' ').replace(/^#{1,6}\s*/gm, '').replace(/[|*_>~-]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function sectionByHeading(markdown, patterns, maximumLines = 24) {
  const lines = String(markdown || '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#{1,6})\s+(.+)$/);
    if (!heading || !patterns.some(pattern => pattern.test(heading[2]))) continue;
    const level = heading[1].length; const content = [];
    for (let cursor = index + 1; cursor < lines.length && content.length < maximumLines; cursor += 1) {
      const next = lines[cursor].match(/^(#{1,6})\s+(.+)$/);
      if (next && next[1].length <= level) break;
      if (next && content.some(line => line.trim())) break;
      content.push(lines[cursor]);
    }
    const text = stripMarkdown(content.join('\n'));
    if (text) return text.slice(0, 1800);
  }
  return '';
}
function sourceBoundaryFromNote(markdown) {
  let value = sectionByHeading(markdown, [/source\s*boundary/i, /来源边界/i, /写作边界/i], 18);
  if (value.length >= 12) return value;
  const lines = String(markdown || '').split(/\r?\n/);
  const index = lines.findIndex(line => /source\s*boundary|来源边界|evidence\s*boundary|写作边界/i.test(line));
  if (index >= 0) value = stripMarkdown(lines.slice(index, index + 16).join('\n'));
  return value.slice(0, 1800);
}
function whyItMattersFromNote(markdown) {
  const patterns = [/一句话.*(?:thesis|结论|定位)/i, /one[- ]sentence\s+thesis/i, /executive\s+(?:readout|read-through|summary)/i,
    /为什么.*(?:重要|值得研究)/i, /为何重要/i, /why\s+it\s+matters/i, /受访对象与通话定位/i, /受访者.*(?:背景|场景)/i,
    /嘉宾.*(?:背景|使用说明)/i, /访谈元数据/i, /guest.*background/i, /reading protocol/i];
  return sectionByHeading(markdown, patterns, 28).slice(0, 1800);
}
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()); }
function validOriginalUrl(value) {
  try { const url = new URL(String(value || '')); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; }
  catch (_) { return false; }
}
function officialRssEpisodeSourceUrl(input = {}) {
  const original = String(input.originalUrl ?? input.link ?? '').trim();
  if (original) return validOriginalUrl(original) ? cleanUrl(original) : '';
  const sourceType = String(input.canonicalSourceType || input.sourceType || '');
  if (!['official_rss', 'historical_official_rss'].includes(sourceType)) return '';
  const enclosure = String(input.officialRssEnclosureUrl ?? input.enclosureUrl ?? '').trim();
  const enclosureType = String(input.officialRssEnclosureType ?? input.enclosureType ?? '');
  const verifiedOfficialAudio = input.officialRssEnclosure === true || /^audio\//i.test(enclosureType);
  if (!verifiedOfficialAudio || !validOriginalUrl(enclosure)) return '';
  return cleanUrl(enclosure);
}
function evaluateLibraryReadiness(input = {}) {
  const reasons = [];
  const note = String(input.noteText || ''); const plain = stripMarkdown(note);
  const facts = noteFacts(note); const noteShow = input.noteShow || input.noteMetadataShow || facts.show;
  const noteSourceUrl = input.noteSourceUrl || facts.url; const sourceUrlShow = input.sourceUrlShow || '';
  if (!input.canonical) reasons.push('canonical_note_not_selected');
  if (!input.notePath || !exists(input.notePath)) reasons.push('source_note_missing');
  if (plain.length < NOTE_MIN_CHARS) reasons.push('source_note_too_short');
  if (PLACEHOLDER.test(note.slice(0, 3000))) reasons.push('source_note_placeholder_or_error');
  if ((plain.match(/[\u3400-\u9fff]/g) || []).length < 80) reasons.push('source_note_not_substantive_chinese');
  if (!input.deterministicQcPassed) reasons.push('deterministic_qc_failed');
  if (!String(input.title || '').trim() || /^(?:unknown|untitled|未命名)/i.test(input.title)) reasons.push('title_unusable');
  if (!String(input.show || '').trim() || /^(?:unknown|untitled|未知)/i.test(input.show)) reasons.push('show_unusable');
  if (!validDate(input.publishedDate)) reasons.push('date_unusable');
  if (!validOriginalUrl(officialRssEpisodeSourceUrl(input))) reasons.push('original_source_url_invalid');
  if (String(input.sourceBoundary || '').trim().length < 12) reasons.push('source_boundary_missing');
  if (String(input.whyItMatters || '').trim().length < 40) reasons.push('why_it_matters_missing');
  if (noteShow && !sameSourceIdentity(input.show, noteShow)) reasons.push('note_show_identity_mismatch');
  if (sourceUrlShow && !sameSourceIdentity(input.show, sourceUrlShow)) reasons.push('source_url_show_identity_mismatch');
  if (noteShow && sourceUrlShow && !sameSourceIdentity(noteShow, sourceUrlShow)) reasons.push('note_source_show_identity_mismatch');
  if (noteSourceUrl) {
    const acceptedUrls = [officialRssEpisodeSourceUrl(input), ...(input.identityUrls || [])].filter(Boolean).map(canonicalUrl);
    if (!acceptedUrls.includes(canonicalUrl(noteSourceUrl))) reasons.push('note_source_url_identity_mismatch');
  }
  if (input.notePath && exists(input.notePath)) {
    const actual = sha256(fs.readFileSync(input.notePath));
    if (!input.expectedSha256 || actual !== input.expectedSha256) reasons.push('artifact_hash_mismatch');
  }
  return { ready: reasons.length === 0, reasons: [...new Set(reasons)].sort(), gateVersion: LIBRARY_GATE_VERSION,
    metrics: { strippedChars: plain.length, cjkChars: (plain.match(/[\u3400-\u9fff]/g) || []).length,
      sourceBoundaryChars: String(input.sourceBoundary || '').length, whyItMattersChars: String(input.whyItMatters || '').length } };
}

function extensionType(file) {
  const extension = path.extname(file).toLocaleLowerCase();
  return extension || '(none)';
}
function genericHistoricalDiscovery(queriesRoot) {
  const reviewed = []; const exclusions = [];
  for (const file of walk(queriesRoot, candidate => /\.md$/i.test(candidate))) {
    if (/invest-like-the-best/i.test(path.basename(file))) continue;
    const nameSignal = /(?:podcast|expert[-_ ]call|lecture|interview|访谈|纪要)/i.test(path.basename(file));
    if (!nameSignal) continue;
    const text = fs.readFileSync(file, 'utf8');
    const contentSignal = /(?:source\s*boundary|来源边界|evidence\s*boundary|transcript|逐字稿|访谈对象)/i.test(text.slice(0, 8000));
    const controlSignal = /(?:catalog|control[-_ ]room|writing[-_ ]standard|architecture|plan|dashboard|index)/i.test(path.basename(file));
    if (contentSignal && !controlSignal && stripMarkdown(text).length >= NOTE_MIN_CHARS) reviewed.push({ path: file, reason: 'podcast_note_signal_confirmed', disposition: 'review_identity_evidence' });
    else exclusions.push({ path: file, reason: controlSignal ? 'control_or_catalog_document' : contentSignal ? 'not_substantive' : 'podcast_mention_without_note_boundary' });
  }
  return { reviewed, exclusions };
}
function inventoryAssets(options = {}) {
  const radarRoot = path.resolve(options.radarRoot || DEFAULT_RADAR_ROOT);
  const queriesRoot = path.resolve(options.queriesRoot || DEFAULT_QUERIES_ROOT);
  const rawReportsRoot = path.resolve(options.rawReportsRoot || DEFAULT_RAW_REPORTS_ROOT);
  const reportsDir = path.resolve(options.reportsDir || DEFAULT_REPORTS_DIR);
  const roots = [radarRoot, queriesRoot, rawReportsRoot];
  const rootCounts = {}; const extensionCounts = {}; let files = 0; let bytes = 0;
  for (const root of roots) {
    const list = walk(root); let rootBytes = 0;
    for (const file of list) {
      const size = fs.statSync(file).size; rootBytes += size; bytes += size; files += 1;
      const extension = extensionType(file); extensionCounts[extension] = (extensionCounts[extension] || 0) + 1;
    }
    rootCounts[root] = { files: list.length, bytes: rootBytes };
  }
  const sobridgeMarkdown = walk(queriesRoot, file => /\/invest-like-the-best-.+-sobridge-notes-\d{8}\.md$/i.test(file)
    && !/writing-standard/i.test(file) && path.dirname(file) === queriesRoot);
  const sobridgeDocx = sobridgeMarkdown.map(file => file.replace(/\.md$/i, '.docx')).filter(exists);
  const podcastTranscripts = walk(rawReportsRoot, file => /(?:podcast|invest-like-the-best)/i.test(file) && /(?:transcript|asr)/i.test(path.basename(file)) && /\.(?:txt|md|json)$/i.test(file));
  const generic = genericHistoricalDiscovery(queriesRoot);
  const inventory = { generatedAt: new Date().toISOString(), sourceRoots: roots, totals: { files, bytes }, rootCounts,
    extensionCounts: Object.fromEntries(Object.entries(extensionCounts).sort()),
    iltbCanonicalSobridgeMarkdown: sobridgeMarkdown.length, iltbCanonicalSobridgeDocx: sobridgeDocx.length,
    iltbCanonicalSobridgeMarkdownBytes: sobridgeMarkdown.reduce((sum, file) => sum + fs.statSync(file).size, 0),
    podcastTranscriptFiles: podcastTranscripts.length, podcastTranscriptBytes: podcastTranscripts.reduce((sum, file) => sum + fs.statSync(file).size, 0),
    genericHistoricalReviewed: generic.reviewed.length, genericHistoricalExcluded: generic.exclusions.length,
    discovered: { iltbCanonicalSobridgeMarkdown: sobridgeMarkdown, iltbCanonicalSobridgeDocx: sobridgeDocx,
      genericReviewCandidates: generic.reviewed, genericFalsePositiveExclusions: generic.exclusions } };
  writeJson(path.join(reportsDir, 'podcast_asset_inventory.json'), inventory);
  return inventory;
}

function titleSimilarity(left, right) {
  const a = new Set(normalizeText(left).split(' ').filter(token => token.length > 1));
  const b = new Set(normalizeText(right).split(' ').filter(token => token.length > 1));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(token => b.has(token)).length;
  return intersection / Math.max(a.size, b.size);
}
function mimeType(file) {
  return ({ '.md': 'text/markdown', '.txt': 'text/plain', '.json': 'application/json', '.csv': 'text/csv', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav' })[path.extname(file).toLocaleLowerCase()] || 'application/octet-stream';
}
function artifactType(file, hint = '') {
  const name = path.basename(file).toLocaleLowerCase(); const extension = path.extname(file).toLocaleLowerCase();
  if (hint) return hint;
  if (/claim.*ledger/.test(name)) return extension === '.json' ? 'claim_ledger_json' : 'claim_ledger_csv';
  if (/investment.*extraction/.test(name)) return 'investment_extraction';
  if (/qc/.test(name)) return 'qc_json';
  if (/manifest|rss_item/.test(name)) return 'source_manifest';
  if (/transcript|asr/.test(name)) return extension === '.json' ? 'transcript_json' : 'transcript_txt';
  if (extension === '.md') return 'note_md';
  if (extension === '.docx') return 'docx';
  if (extension === '.pdf') return 'pdf';
  if (['.mp3', '.m4a', '.wav'].includes(extension)) return 'audio';
  return 'source_manifest';
}
function noteRank(file) {
  const name = path.basename(file).toLocaleLowerCase();
  if (/sobridge-notes/.test(name)) return 100;
  if (/source[-_ ]faithful/.test(name)) return 95;
  if (/enhanced|v2[-_ ]qc/.test(name)) return 80;
  if (/strict/.test(name)) return 70;
  if (/expert[-_ ]call/.test(name)) return 60;
  if (/source[-_ ]brief/.test(name)) return 10;
  return 30;
}
function noteLabel(file) {
  const name = path.basename(file).toLocaleLowerCase();
  if (/sobridge/.test(name)) return 'sobridge';
  if (/source[-_ ]faithful/.test(name)) return 'source-faithful';
  if (/enhanced/.test(name)) return 'enhanced';
  if (/strict/.test(name)) return 'strict';
  if (/source[-_ ]brief/.test(name)) return 'source-brief';
  return 'historical';
}

class EpisodeBuilder {
  constructor(options = {}) {
    this.since = options.since || DEFAULT_SINCE;
    this.showFilter = (options.shows || []).map(normalizeText);
    this.shows = new Map(); this.aliases = new Map(); this.episodes = new Map(); this.identities = new Map();
    this.mergeLedger = []; this.warnings = []; this.candidateReview = []; this.rawRss = new Map();
    this.videoShows = new Map();
    this.counts = { monitoredShows: 0, officialSinceCutoff: 0, candidateRows: 0, candidateAliasesMerged: 0,
      radarIndexed: 0, radarReadyImported: 0, iltbCanonicalSobridgeMarkdown: 0, iltbVersions: 0,
      genericReviewed: 0, genericExcluded: 0, attachedArtifacts: 0, importedClaims: 0 };
  }

  addShow(sourceKey, source = {}) {
    const aliases = [...new Set([sourceKey, source.show_title, source.collectionName, source.artistName].filter(Boolean))];
    const canonicalName = source.collectionName || source.show_title || sourceKey;
    const searchable = aliases.map(normalizeText);
    if (this.showFilter.length && !this.showFilter.some(filter => searchable.some(alias => alias.includes(filter) || filter.includes(alias)))) return null;
    const identity = source.feed_url || source.collectionId || sourceKey;
    const id = stableId('show', identity);
    const show = { id, canonicalName, slug: slugify(sourceKey || canonicalName), tier: source.tier || 'standard', publisher: source.artistName || '',
      officialFeedUrl: cleanUrl(source.feed_url), appleCollectionId: source.collectionId == null ? '' : String(source.collectionId),
      officialPageUrl: cleanUrl(source.trackViewUrl), active: source.active === false ? 0 : 1, aliases: [] };
    const extra = [...CORE_SHOWS, ...PRIORITY_SHOWS].find(entry => [entry.name, ...(entry.aliases || [])].some(alias => aliases.some(value => normalizeText(value).includes(normalizeText(alias)))));
    for (const alias of [...aliases, ...(extra?.aliases || []), extra?.name].filter(Boolean)) {
      const normalized = normalizeText(alias); if (!normalized) continue;
      show.aliases.push({ alias, normalized, sourceType: aliases.includes(alias) ? 'source_registry' : 'controlled_alias', confidence: aliases.includes(alias) ? 1 : 0.95 });
      if (!this.aliases.has(normalized)) this.aliases.set(normalized, id);
    }
    this.shows.set(id, show); this.counts.monitoredShows += 1;
    return show;
  }

  addShowAlias(show, alias, sourceType = 'controlled_alias', confidence = 0.95) {
    const normalized = normalizeText(alias);
    if (!show || !normalized) return;
    if (!show.aliases.some(value => value.normalized === normalized)) show.aliases.push({ alias, normalized, sourceType, confidence });
    if (!this.aliases.has(normalized)) this.aliases.set(normalized, show.id);
  }

  registerVideoShow(videoId, show, evidence, rank = 0) {
    if (!videoId || !show) return;
    const previous = this.videoShows.get(videoId);
    if (previous && previous.showId !== show.id && previous.rank === rank) {
      this.warnings.push({ code: 'youtube_source_identity_conflict', videoId, existingShowId: previous.showId, incomingShowId: show.id, evidence });
      this.videoShows.delete(videoId);
      return;
    }
    if (!previous || rank > previous.rank) this.videoShows.set(videoId, { showId: show.id, evidence, rank });
  }

  showForVideo(videoId) {
    const identity = this.videoShows.get(String(videoId || ''));
    return identity ? this.shows.get(identity.showId) : null;
  }

  resolveShow(value) {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    if (this.aliases.has(normalized)) return this.shows.get(this.aliases.get(normalized));
    const candidates = [...this.aliases.entries()].filter(([alias]) => normalized.includes(alias) || alias.includes(normalized)).sort((a, b) => b[0].length - a[0].length);
    return candidates.length ? this.shows.get(candidates[0][1]) : null;
  }

  identityPairs(meta, show) {
    const pairs = [];
    if (meta.guid) pairs.push(['rss_guid', String(meta.guid).trim()]);
    const video = meta.youtubeId || youtubeId(meta.originalUrl); if (video) pairs.push(['youtube_id', video]);
    const original = cleanUrl(meta.originalUrl); if (original) pairs.push(['canonical_url', original]);
    const enclosure = cleanUrl(meta.audioUrl); if (enclosure) pairs.push(['enclosure_url', enclosure]);
    const number = meta.episodeNumber || episodeNumber(meta.title); if (number) pairs.push(['episode_number', `${show.id}:${number}`]);
    if (meta.candidateId) pairs.push(['candidate_id', String(meta.candidateId)]);
    return pairs;
  }

  findEpisode(meta, show, pairs) {
    for (const [type, value] of pairs) {
      const id = this.identities.get(`${type}:${value}`);
      if (id) return { episode: this.episodes.get(id), evidence: type };
    }
    const date = meta.publishedDate || published(meta.publishedAt).date;
    const number = meta.episodeNumber || episodeNumber(meta.title);
    for (const episode of this.episodes.values()) {
      if (episode.showId !== show.id) continue;
      if (number && episode.episodeNumber === String(number)) return { episode, evidence: 'show_episode_number' };
      if (!date || !episode.publishedDate) continue;
      const days = Math.abs(new Date(`${date}T00:00:00Z`) - new Date(`${episode.publishedDate}T00:00:00Z`)) / 86400000;
      const similarity = titleSimilarity(meta.title, episode.title);
      if (days <= 3 && similarity >= 0.55) return { episode, evidence: `show_date_title:${similarity.toFixed(3)}` };
    }
    return null;
  }

  addEpisode(meta, options = {}) {
    const show = meta.showId ? this.shows.get(meta.showId) : this.resolveShow(meta.show || meta.sourceKey);
    if (!show) { if (options.warn !== false) this.warnings.push({ code: 'show_unresolved', source: meta.source || '', title: meta.title || '', show: meta.show || '' }); return null; }
    const date = meta.publishedDate ? { at: meta.publishedAt || `${meta.publishedDate}T00:00:00.000Z`, date: meta.publishedDate } : published(meta.publishedAt);
    const pairs = this.identityPairs(meta, show);
    const match = this.findEpisode({ ...meta, publishedDate: date.date }, show, pairs);
    let episode = match?.episode;
    if (!episode && options.create === false) return null;
    if (!episode) {
      const seedPair = pairs.find(([type]) => ['rss_guid', 'youtube_id', 'canonical_url', 'enclosure_url', 'episode_number'].includes(type));
      const seed = seedPair ? `${seedPair[0]}:${seedPair[1]}` : `${show.id}:${date.date || 'undated'}:${normalizeText(meta.title)}`;
      const id = stableId('ep', seed);
      episode = { id, showId: show.id, title: String(meta.title || '').trim(), normalizedTitle: normalizeText(meta.title), publishedAt: date.at,
        publishedDate: date.date, durationSeconds: meta.durationSeconds ?? null, durationText: meta.durationText || '', description: meta.description || '',
        originalUrl: cleanUrl(meta.originalUrl), audioUrl: cleanUrl(meta.audioUrl), mediaType: meta.mediaType || 'podcast', materiality: meta.materiality || 'unknown',
        canonicalSourceType: meta.sourceType || 'discovery', episodeNumber: String(meta.episodeNumber || episodeNumber(meta.title) || ''),
        externalIds: [], artifacts: [], notes: [], claims: [], sourceRecords: [], sourceUrlShow: meta.sourceUrlShow || '' };
      this.episodes.set(id, episode);
    } else if (options.recordMerge !== false) {
      this.mergeLedger.push({ canonicalEpisodeId: episode.id, incomingSource: meta.source || meta.sourceType || 'unknown',
        incomingIdentity: pairs.map(([type, value]) => ({ type, value })), evidence: match.evidence, action: 'merged' });
    }
    const sourcePriority = { official_rss: 100, historical_official_rss: 90, radar_archive: 60, discovery: 10 };
    if ((sourcePriority[meta.sourceType] || 0) > (sourcePriority[episode.canonicalSourceType] || 0)) {
      episode.title = meta.title || episode.title; episode.normalizedTitle = normalizeText(episode.title); episode.description = meta.description || episode.description;
      episode.originalUrl = cleanUrl(meta.originalUrl) || episode.originalUrl; episode.audioUrl = cleanUrl(meta.audioUrl) || episode.audioUrl;
      episode.publishedAt = date.at || episode.publishedAt; episode.publishedDate = date.date || episode.publishedDate;
      episode.durationSeconds = meta.durationSeconds ?? episode.durationSeconds; episode.durationText = meta.durationText || episode.durationText;
      episode.canonicalSourceType = meta.sourceType;
    } else {
      episode.description ||= meta.description || ''; episode.originalUrl ||= cleanUrl(meta.originalUrl); episode.audioUrl ||= cleanUrl(meta.audioUrl);
      episode.publishedAt ||= date.at; episode.publishedDate ||= date.date; episode.durationSeconds ??= meta.durationSeconds ?? null; episode.durationText ||= meta.durationText || '';
    }
    if (meta.materiality && episode.materiality === 'unknown') episode.materiality = meta.materiality;
    episode.sourceUrlShow ||= meta.sourceUrlShow || '';
    for (const [type, value] of pairs) {
      const key = `${type}:${value}`; const owner = this.identities.get(key);
      if (owner && owner !== episode.id) { this.warnings.push({ code: 'identity_conflict', type, value, owner, incoming: episode.id }); continue; }
      this.identities.set(key, episode.id);
      if (!episode.externalIds.some(item => item.type === type && item.value === value)) episode.externalIds.push({ type, value, source: meta.source || meta.sourceType || 'import' });
    }
    episode.sourceRecords.push(meta.source || meta.sourceType || 'import');
    return episode;
  }

  addArtifact(episode, file, hint = '', sourceLayer = 'historical', privacyClass = '') {
    if (!episode || !exists(file) || episode.artifacts.some(item => item.path === file)) return null;
    const stat = fs.statSync(file); const type = artifactType(file, hint);
    const artifact = { id: stableId('artifact', path.resolve(file)), episodeId: episode.id, type, path: path.resolve(file), safeName: path.basename(file).replace(/[^\w.\-\u4e00-\u9fff]/g, '_'),
      sha256: sha256(fs.readFileSync(file)), bytes: stat.size, mimeType: mimeType(file), sourceLayer, createdAt: stat.birthtime.toISOString(),
      mtime: stat.mtime.toISOString(), canonical: 0, supersededBy: null,
      privacyClass: privacyClass || (['note_md', 'docx', 'pdf'].includes(type) ? 'reader' : 'private') };
    episode.artifacts.push(artifact); this.counts.attachedArtifacts += 1; return artifact;
  }

  addNote(episode, file, options = {}) {
    if (!episode || !exists(file) || episode.notes.some(note => note.path === file)) return null;
    const artifact = this.addArtifact(episode, file, 'note_md', options.sourceLayer || 'historical', 'reader');
    const text = fs.readFileSync(file, 'utf8');
    const identity = noteFacts(text);
    const note = { id: stableId('note', path.resolve(file)), episodeId: episode.id, artifactId: artifact.id, path: path.resolve(file), text,
      versionLabel: options.versionLabel || noteLabel(file), writingStyle: options.writingStyle || noteLabel(file), rank: options.rank ?? noteRank(file),
      charCount: stripMarkdown(text).length, language: (text.match(/[\u3400-\u9fff]/g) || []).length >= 80 ? 'zh-CN' : 'unknown',
      sourceBoundary: options.sourceBoundary || sourceBoundaryFromNote(text), whyItMatters: options.whyItMatters || whyItMattersFromNote(text),
      noteShow: identity.show, noteSourceUrl: identity.url,
      deterministicQcPassed: options.deterministicQcPassed !== false, importedAt: new Date().toISOString() };
    episode.notes.push(note); return note;
  }
}

function stateSources(state) {
  if (!state?.sources) return [];
  return Array.isArray(state.sources) ? state.sources.map((value, index) => [value.key || value.name || String(index), value]) : Object.entries(state.sources);
}
function importOfficialRss(builder, radarRoot) {
  const state = readJson(path.join(radarRoot, 'state.json'), {});
  for (const [sourceKey, source] of stateSources(state)) {
    const show = builder.addShow(sourceKey, source); if (!show) continue;
    const rssPath = source.last_raw_path && exists(source.last_raw_path) ? source.last_raw_path : null;
    if (!rssPath) { builder.warnings.push({ code: 'rss_archive_missing', show: show.canonicalName }); continue; }
    const feed = parseRss(fs.readFileSync(rssPath, 'utf8'));
    builder.rawRss.set(show.id, feed.items);
    for (const item of feed.items) {
      const date = published(item.publishedAt);
      if (!date.date || date.date < builder.since) continue;
      builder.addEpisode({ showId: show.id, title: item.title, publishedAt: item.publishedAt, description: item.description,
        originalUrl: officialRssEpisodeSourceUrl({ originalUrl: item.link, sourceType: 'official_rss',
          officialRssEnclosureUrl: item.enclosureUrl, officialRssEnclosureType: item.enclosureType }),
        audioUrl: item.enclosureUrl, guid: item.guid, episodeNumber: item.episodeNumber,
        durationSeconds: item.durationSeconds, durationText: item.durationText, sourceType: 'official_rss', source: rssPath });
      builder.counts.officialSinceCutoff += 1;
    }
  }
}
function importYoutubeSources(builder, radarRoot) {
  const state = readJson(path.join(radarRoot, 'state.json'), {});
  for (const [sourceKey, source] of Object.entries(state.youtube_sources || state.youtubeSources || {})) {
    let show = builder.resolveShow(sourceKey);
    if (!show) show = builder.addShow(`youtube:${sourceKey}`, { ...source, show_title: sourceKey, collectionName: sourceKey, tier: source.tier || 'priority' });
    if (!show) continue;
    builder.addShowAlias(show, sourceKey, 'youtube_source_registry', 1);
    builder.addShowAlias(show, `youtube:${sourceKey}`, 'youtube_source_registry', 1);
  }
  for (const [videoId, source] of youtubeSourceRecords(state)) {
    const show = builder.resolveShow(source.sourceKey || source.show);
    if (show) builder.registerVideoShow(videoId, show, source.evidence, source.rank);
  }
}
function candidateArrays(value) {
  if (Array.isArray(value)) return value;
  for (const key of ['candidates', 'items', 'results', 'episodes']) if (Array.isArray(value?.[key])) return value[key];
  return [];
}
function importCandidates(builder, radarRoot) {
  const files = walk(radarRoot, file => /(?:^|\/)(?:candidates|scan_candidates|recent_candidates|youtube_candidates_resolved)\.json$/i.test(file));
  const seen = new Set();
  for (const file of files) for (const candidate of candidateArrays(readJson(file, []))) {
    const id = String(candidate.id || candidate.candidate_id || '');
    const unique = id || sha256(JSON.stringify([candidate.url, candidate.title, candidate.published]));
    if (seen.has(unique)) continue; seen.add(unique); builder.counts.candidateRows += 1;
    const date = published(candidate.published || candidate.published_at || candidate.date || path.basename(path.dirname(file)));
    if (date.date && date.date < builder.since) continue;
    const video = candidate.video_id || youtubeId(candidate.url);
    const show = builder.showForVideo(video) || builder.resolveShow(candidate.source_key || candidate.show || candidate.channel);
    if (!show) { builder.candidateReview.push({ candidateId: id, reason: 'show_unresolved', source: file }); continue; }
    const episode = builder.addEpisode({ showId: show.id, title: candidate.title, publishedAt: candidate.published || candidate.published_at,
      description: candidate.description, originalUrl: candidate.url || candidate.link, audioUrl: candidate.audio_url,
      candidateId: id, youtubeId: video, materiality: candidate.materiality, sourceUrlShow: builder.showForVideo(video)?.canonicalName || '',
      mediaType: candidate.type || 'podcast', sourceType: 'radar_candidate', source: file }, { create: false });
    if (episode) builder.counts.candidateAliasesMerged += 1;
    else builder.candidateReview.push({ candidateId: id, title: candidate.title || '', show: show.canonicalName, publishedDate: date.date,
      reason: 'no_official_identity_match', source: file });
  }
}

function importRadarArchive(builder, radarRoot) {
  const index = buildIndex(radarRoot);
  builder.counts.radarIndexed = index.episodes.length;
  for (const item of index.episodes) {
    const video = item.videoId || youtubeId(item.originalUrl);
    const show = builder.showForVideo(video) || builder.resolveShow(item.sourceKey || item.show); if (!show) continue;
    let episode = item.metadata?.episode_id ? builder.episodes.get(String(item.metadata.episode_id)) : null;
    if (item.metadata?.episode_id && episode) {
      const incomingUrl = cleanUrl(item.originalUrl);
      const sameUrl = Boolean(incomingUrl && episode.originalUrl && incomingUrl === episode.originalUrl);
      if (episode.showId !== show.id || (!sameUrl && titleSimilarity(item.title, episode.title) < 0.55)) {
        builder.warnings.push({ code: 'radar_canonical_episode_id_mismatch', episodeId: String(item.metadata.episode_id),
          source: item.metadataPath || item.dateDetected, title: item.title });
        continue;
      }
    }
    if (item.metadata?.episode_id && !episode) {
      builder.warnings.push({ code: 'radar_canonical_episode_id_not_found', episodeId: String(item.metadata.episode_id),
        source: item.metadataPath || item.dateDetected });
      continue;
    }
    episode ||= builder.addEpisode({ showId: show.id, title: item.title, publishedAt: item.publishedAt || item.dateDetected,
      description: item.description, originalUrl: item.originalUrl, audioUrl: item.audioUrl, candidateId: item.candidateId,
      youtubeId: video, materiality: item.materiality, mediaType: item.mediaType, sourceType: 'radar_archive',
      sourceUrlShow: builder.showForVideo(video)?.canonicalName || item.sourceUrlShow || '',
      source: item.metadataPath || item.dateDetected }, { create: Boolean(item.presentationReady) });
    if (!episode) continue;
    for (const [key, hint] of [['transcriptPath', 'transcript_txt'], ['audioPath', 'audio'], ['qcPath', 'qc_json'], ['docxPath', 'docx'], ['pdfPath', 'pdf'],
      ['investmentExtractionPath', 'investment_extraction'], ['metadataPath', 'source_manifest'], ['sourceManifestPath', 'source_manifest']])
      if (item[key]) builder.addArtifact(episode, item[key], hint, 'radar_archive');
    if (item.notePath) builder.addNote(episode, item.notePath, { versionLabel: 'source-faithful', writingStyle: 'source-faithful', rank: 95,
      sourceLayer: 'radar_archive', sourceBoundary: item.transcriptBoundary, whyItMatters: item.whyItMatters, deterministicQcPassed: Boolean(item.qcPassed) });
    if (item.presentationReady) builder.counts.radarReadyImported += 1;
  }
}

function iltbShow(builder) { return builder.resolveShow('Invest Like the Best'); }
function iltbRssItem(builder, number) {
  const show = iltbShow(builder); if (!show) return null;
  return (builder.rawRss.get(show.id) || []).find(item => String(item.episodeNumber || episodeNumber(item.title)) === String(number));
}
function ensureIltbEpisode(builder, number, source) {
  const show = iltbShow(builder); const item = iltbRssItem(builder, number);
  if (!show || !item) { builder.warnings.push({ code: 'iltb_official_metadata_not_found', episodeNumber: number, source }); return null; }
  return builder.addEpisode({ showId: show.id, title: item.title, publishedAt: item.publishedAt, description: item.description,
    originalUrl: officialRssEpisodeSourceUrl({ originalUrl: item.link, sourceType: 'historical_official_rss',
      officialRssEnclosureUrl: item.enclosureUrl, officialRssEnclosureType: item.enclosureType }),
    audioUrl: item.enclosureUrl, guid: item.guid, episodeNumber: item.episodeNumber || number, durationSeconds: item.durationSeconds,
    durationText: item.durationText, sourceType: 'historical_official_rss', source }, { recordMerge: false });
}
function isIltbNote(file) {
  const name = path.basename(file);
  return /^invest-like-the-best-.+\.md$/i.test(name) && !/(?:control-room|writing-standard|timeline|catalog|big-plan|latest\d+|toc)/i.test(name);
}
function importIltbNotes(builder, queriesRoot) {
  const files = fs.readdirSync(queriesRoot, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => path.join(queriesRoot, entry.name)).filter(isIltbNote).sort();
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8'); const number = episodeNumber(text.slice(0, 12000));
    if (!number) { builder.warnings.push({ code: 'iltb_note_episode_number_missing', source: file }); continue; }
    const episode = ensureIltbEpisode(builder, number, file); if (!episode) continue;
    const note = builder.addNote(episode, file, { sourceLayer: 'iltb_lmvk' }); if (!note) continue;
    builder.counts.iltbVersions += 1;
    if (/sobridge-notes-\d{8}\.md$/i.test(file)) builder.counts.iltbCanonicalSobridgeMarkdown += 1;
    for (const sibling of [file.replace(/\.md$/i, '.docx'), file.replace(/\.md$/i, '.pdf'), file.replace(/\.md$/i, '_qc.json'), `${file}.qc.json`])
      if (exists(sibling)) builder.addArtifact(episode, sibling, '', 'iltb_lmvk');
  }
}

function inferIltbNumber(file, rssAncestorMap) {
  let directory = path.dirname(file);
  while (directory !== path.dirname(directory)) {
    if (rssAncestorMap.has(directory)) return rssAncestorMap.get(directory);
    directory = path.dirname(directory);
  }
  const value = `${file} ${path.basename(file)}`;
  const explicit = episodeNumber(value); if (explicit) return explicit;
  if (/anthropic[-_ ]cfo|krishna[-_ ]rao/i.test(value)) return '472';
  if (/josh[-_ ]kushner|thrive/i.test(value)) return '459';
  return '';
}
function importIltbRawArtifacts(builder, rawReportsRoot) {
  const relevant = walk(rawReportsRoot, file => /invest-like-the-best|youtube-podcast-anthropic-cfo/i.test(file));
  const rssAncestorMap = new Map();
  for (const file of relevant.filter(file => /rss_item\.json$/i.test(file))) {
    const item = readJson(file, {}); const number = item.episodeNumber || item.episode_no || episodeNumber(item.title);
    if (number) rssAncestorMap.set(path.dirname(file), String(number));
  }
  for (const file of relevant) {
    const name = path.basename(file);
    if (!/(?:transcript|asr|writing[-_ ]qc|rss_item|source[-_ ]manifest)/i.test(name) || !/\.(?:txt|md|json)$/i.test(file)) continue;
    const number = inferIltbNumber(file, rssAncestorMap); if (!number) continue;
    const episode = ensureIltbEpisode(builder, number, file); if (!episode) continue;
    builder.addArtifact(episode, file, '', 'iltb_raw');
  }
}

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(field); field = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); field = ''; if (row.some(value => value !== '')) rows.push(row); row = [];
    } else field += character;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map(header => header.trim());
  return rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}
function importIltbClaims(builder, queriesRoot) {
  const inventory = path.join(queriesRoot, 'inventory');
  for (const file of walk(inventory, candidate => /invest-like-the-best-.+claim-ledger.+\.(?:csv|json)$/i.test(candidate))) {
    const basename = path.basename(file); let number = episodeNumber(basename);
    if (!number) {
      const token = normalizeText(basename.replace(/claim-ledger.*$/i, ''));
      const show = iltbShow(builder); const items = show ? builder.rawRss.get(show.id) || [] : [];
      const ranked = items.map(item => ({ item, score: titleSimilarity(token, item.title) })).sort((a, b) => b.score - a.score);
      if (ranked[0]?.score >= 0.2) number = ranked[0].item.episodeNumber || episodeNumber(ranked[0].item.title);
      if (!number && show) {
        const guestMatches = [...builder.episodes.values()].filter(episode => episode.showId === show.id && episode.episodeNumber)
          .map(episode => ({ episode, guest: normalizeText(guestEntity(episode.title)) }))
          .filter(match => match.guest.length >= 4 && token.includes(match.guest)).sort((left, right) => right.guest.length - left.guest.length);
        if (guestMatches.length) number = guestMatches[0].episode.episodeNumber;
      }
    }
    if (!number) { builder.warnings.push({ code: 'claim_ledger_episode_unresolved', source: file }); continue; }
    const episode = ensureIltbEpisode(builder, number, file); if (!episode) continue;
    const artifact = builder.addArtifact(episode, file, '', 'iltb_lmvk');
    if (path.extname(file).toLocaleLowerCase() !== '.csv') continue;
    for (const [index, row] of parseCsv(fs.readFileSync(file, 'utf8')).entries()) {
      const claim = row.claim || row.Claim || row['主张']; if (!claim) continue;
      episode.claims.push({ id: stableId('claim', `${file}:${index}:${claim}`), timestamp: row.timestamp || '', speaker: row.speaker || '', claim,
        implication: row.implication || '', evidenceLabel: row.evidence_label || '', currentWeight: row.current_weight || '',
        verificationNeeded: /^(?:1|true|yes)|需|核验/i.test(row.verification_needed || '') ? 1 : 0, sourceArtifactId: artifact.id });
      builder.counts.importedClaims += 1;
    }
  }
}

function extractThemes(text) {
  const source = String(text || '').toLocaleLowerCase();
  const rules = [['AI Infra', /gpu|compute|token|semiconductor|芯片|算力|wafers|memory/], ['AI Agents', /agent|copilot|智能体/],
    ['Enterprise AI', /enterprise|workflow|arr|企业|商业化/], ['Venture / Pre-IPO', /venture|startup|founder|valuation|vc|融资|估值|创始人/],
    ['Markets / Macro', /market|macro|credit|rates|投资|市场|利率|private credit/], ['Product / GTM', /product|growth|gtm|distribution|sales|产品|增长|销售/],
    ['Robotics / Physical AI', /robot|physical ai|机器人/], ['Health / Biotech', /health|medicine|drug|健康|药物|生命科学/]];
  return rules.filter(([, pattern]) => pattern.test(source)).map(([name]) => name).slice(0, 6);
}
function guestEntity(title) {
  const clean = stripInvisibleUnicode(title).trim();
  const divided = clean.match(/^(.{2,80}?)\s+[-–—]\s+.+\[\s*Invest Like the Best\s*,\s*EP\.?\s*\d+\s*\]\s*$/i);
  if (!divided) return '';
  const value = divided[1].replace(/^\s*(?:Invest Like the Best\s*)?(?:EP\.?\d+\s*)?/i, '').trim();
  if (!value || /\d|[^\p{L}\p{M}'’.\s-]/u.test(value) || /^(?:how|why|the|what|episode|special edition|wtt|ai|open source|podcast)/i.test(value)) return '';
  if (/^[\u3400-\u9fff]{2,4}$/u.test(value)) return value;
  const tokens = value.split(/\s+/);
  return tokens.length >= 2 && tokens.length <= 5 && tokens.every(token => /^\p{Lu}[\p{L}\p{M}'’.-]*$/u.test(token)) ? value : '';
}

function episodeIdentityUrls(episode) {
  const urls = [episode.originalUrl, episode.audioUrl];
  for (const identity of episode.externalIds) {
    if (identity.type === 'canonical_url' || identity.type === 'enclosure_url') urls.push(identity.value);
    else if (identity.type === 'youtube_id') urls.push(`https://www.youtube.com/watch?v=${identity.value}`);
  }
  return urls.filter(Boolean);
}

function canonicalize(builder) {
  for (const episode of builder.episodes.values()) {
    episode.notes.sort((left, right) => right.rank - left.rank || right.charCount - left.charCount || left.path.localeCompare(right.path));
    episode.notes.forEach((note, index) => { note.canonical = index === 0 ? 1 : 0; note.superseded = index === 0 ? 0 : 1;
      const artifact = episode.artifacts.find(item => item.id === note.artifactId); artifact.canonical = note.canonical; });
    const canonical = episode.notes[0]; const show = builder.shows.get(episode.showId);
    const sourceUrlShow = builder.showForVideo(youtubeId(canonical?.noteSourceUrl || episode.originalUrl))?.canonicalName || episode.sourceUrlShow;
    const readiness = canonical ? evaluateLibraryReadiness({ title: episode.title, show: show.canonicalName, publishedDate: episode.publishedDate,
      originalUrl: episode.originalUrl, noteText: canonical.text, notePath: canonical.path, expectedSha256: episode.artifacts.find(item => item.id === canonical.artifactId).sha256,
      sourceBoundary: canonical.sourceBoundary, whyItMatters: canonical.whyItMatters, canonical: true,
      deterministicQcPassed: canonical.deterministicQcPassed, noteShow: canonical.noteShow, noteSourceUrl: canonical.noteSourceUrl,
      sourceUrlShow, identityUrls: episodeIdentityUrls(episode) }) : { ready: false, gateVersion: LIBRARY_GATE_VERSION,
      reasons: ['canonical_note_missing', 'deterministic_qc_failed', 'source_boundary_missing', 'why_it_matters_missing'], metrics: {} };
    episode.readiness = readiness;
    const transcript = episode.artifacts.some(artifact => ['transcript_txt', 'transcript_json'].includes(artifact.type));
    episode.productionStatus = readiness.ready ? 'qc_passed' : canonical ? 'note_ready' : transcript ? 'transcript_ready' : 'discovered';
    episode.themes = extractThemes(`${episode.title}\n${episode.description}\n${canonical?.text || ''}`);
    episode.entities = extractEntities({ title: episode.title, description: episode.description, note: canonical?.text || '' }).map(entity => ({ ...entity,
      type: ['company', 'person', 'organization', 'asset'].includes(entity.type) ? entity.type : 'organization' }));
    const guest = guestEntity(episode.title);
    if (guest && !episode.entities.some(entity => normalizeText(entity.name) === normalizeText(guest))) episode.entities.unshift({ id: stableId('entity', `person:${normalizeText(guest)}`), name: guest,
      type: 'person', aliases: [], confidence: 'title', evidenceField: 'title' });
  }
}

function insertBuilder(db, builder, run, inventory) {
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO ingest_runs(id,started_at,status,source_roots,source_counts,code_version) VALUES (?,?,?,?,?,?)`).run(run.id, run.startedAt, 'running', JSON.stringify(run.sourceRoots), '{}', 'task-004-v1');
  const showStatement = db.prepare(`INSERT INTO shows(id,canonical_name,slug,tier,publisher,official_feed_url,apple_collection_id,official_page_url,active,first_seen_at,last_seen_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const aliasStatement = db.prepare('INSERT OR IGNORE INTO show_aliases(show_id,alias,normalized_alias,source_type,confidence) VALUES (?,?,?,?,?)');
  for (const show of builder.shows.values()) {
    showStatement.run(show.id, show.canonicalName, show.slug, show.tier, show.publisher, show.officialFeedUrl, show.appleCollectionId, show.officialPageUrl, show.active, now, now);
    for (const alias of show.aliases) aliasStatement.run(show.id, alias.alias, alias.normalized, alias.sourceType, alias.confidence);
  }
  const episodeStatement = db.prepare(`INSERT INTO episodes(id,show_id,canonical_title,normalized_title,published_at,published_date,duration_seconds,duration_text,description,original_url,audio_url,
    media_type,materiality,production_status,first_seen_at,last_seen_at,canonical_source_type,reader_ready,public_ready,gate_version,block_reasons_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const externalStatement = db.prepare('INSERT INTO episode_external_ids(episode_id,id_type,id_value,source) VALUES (?,?,?,?)');
  const artifactStatement = db.prepare(`INSERT INTO artifacts(id,episode_id,artifact_type,origin_path,safe_download_name,sha256,bytes,mime_type,source_layer,created_at,mtime,canonical,superseded_by,privacy_class)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const noteStatement = db.prepare(`INSERT INTO note_versions(id,episode_id,artifact_id,version_label,writing_style,char_count,language,source_boundary,why_it_matters,note_text,canonical,superseded,imported_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const qcStatement = db.prepare(`INSERT INTO qc_runs(id,episode_id,artifact_id,gate_version,passed,reason_codes_json,metrics_json,qc_artifact_id,checked_at,checker_version)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const themeStatement = db.prepare('INSERT OR IGNORE INTO themes(id,name,normalized_name) VALUES (?,?,?)');
  const episodeThemeStatement = db.prepare('INSERT OR IGNORE INTO episode_themes(episode_id,theme_id,provenance) VALUES (?,?,?)');
  const entityStatement = db.prepare('INSERT OR IGNORE INTO entities(id,entity_type,canonical_name,normalized_name,aliases_json) VALUES (?,?,?,?,?)');
  const episodeEntityStatement = db.prepare('INSERT OR IGNORE INTO episode_entities(episode_id,entity_id,evidence_source,confidence) VALUES (?,?,?,?)');
  const claimStatement = db.prepare(`INSERT OR IGNORE INTO claims(id,episode_id,timestamp,speaker,claim,implication,evidence_label,current_weight,verification_needed,source_artifact_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const queueStatement = db.prepare(`INSERT INTO production_queue(episode_id,priority,status,missing_transcript,missing_note,missing_qc,missing_metadata,reason_codes_json,next_action,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const ftsStatement = db.prepare('INSERT INTO episode_search(episode_id,canonical_title,show_name,description,canonical_note,entities,themes,claims) VALUES (?,?,?,?,?,?,?,?)');
  for (const episode of builder.episodes.values()) {
    const show = builder.shows.get(episode.showId); const ready = episode.readiness.ready ? 1 : 0;
    episodeStatement.run(episode.id, episode.showId, episode.title, episode.normalizedTitle, episode.publishedAt, episode.publishedDate, episode.durationSeconds,
      episode.durationText, episode.description, episode.originalUrl, episode.audioUrl, episode.mediaType, episode.materiality, episode.productionStatus,
      now, now, episode.canonicalSourceType, ready, ready, LIBRARY_GATE_VERSION, JSON.stringify(episode.readiness.reasons));
    for (const external of episode.externalIds) externalStatement.run(episode.id, external.type, external.value, external.source);
    for (const artifact of episode.artifacts) artifactStatement.run(artifact.id, episode.id, artifact.type, artifact.path, artifact.safeName, artifact.sha256,
      artifact.bytes, artifact.mimeType, artifact.sourceLayer, artifact.createdAt, artifact.mtime, artifact.canonical, artifact.supersededBy, artifact.privacyClass);
    const qcArtifact = episode.artifacts.find(artifact => artifact.type === 'qc_json');
    for (const note of episode.notes) {
      noteStatement.run(note.id, episode.id, note.artifactId, note.versionLabel, note.writingStyle, note.charCount, note.language,
        note.sourceBoundary, note.whyItMatters, note.text, note.canonical, note.superseded, note.importedAt);
      const result = note.canonical ? episode.readiness : evaluateLibraryReadiness({ title: episode.title, show: show.canonicalName, publishedDate: episode.publishedDate,
        originalUrl: episode.originalUrl, noteText: note.text, notePath: note.path, expectedSha256: episode.artifacts.find(item => item.id === note.artifactId).sha256,
        sourceBoundary: note.sourceBoundary, whyItMatters: note.whyItMatters, canonical: false, deterministicQcPassed: note.deterministicQcPassed,
        noteShow: note.noteShow, noteSourceUrl: note.noteSourceUrl,
        sourceUrlShow: builder.showForVideo(youtubeId(note.noteSourceUrl || episode.originalUrl))?.canonicalName || episode.sourceUrlShow,
        identityUrls: episodeIdentityUrls(episode) });
      qcStatement.run(stableId('qc', `${note.id}:${LIBRARY_GATE_VERSION}:import-v1`), episode.id, note.artifactId, LIBRARY_GATE_VERSION,
        result.ready ? 1 : 0, JSON.stringify(result.reasons), JSON.stringify(result.metrics), qcArtifact?.id || null, now, 'deterministic-import-v1');
    }
    for (const theme of episode.themes) {
      const id = stableId('theme', normalizeText(theme)); themeStatement.run(id, theme, normalizeText(theme)); episodeThemeStatement.run(episode.id, id, 'deterministic-keyword-v1');
    }
    for (const entity of episode.entities) {
      const type = ['company', 'person', 'organization', 'asset'].includes(entity.type) ? entity.type : 'organization';
      const id = entity.id.startsWith?.('entity_') ? entity.id : stableId('entity', `${type}:${normalizeText(entity.name)}`);
      entityStatement.run(id, type, entity.name, normalizeText(entity.name), JSON.stringify(entity.aliases || []));
      episodeEntityStatement.run(episode.id, id, entity.evidenceField || 'note', entity.confidence === 'exact' ? 1 : entity.confidence === 'alias' ? 0.9 : 0.8);
    }
    for (const claim of episode.claims) claimStatement.run(claim.id, episode.id, claim.timestamp, claim.speaker, claim.claim, claim.implication,
      claim.evidenceLabel, claim.currentWeight, claim.verificationNeeded, claim.sourceArtifactId);
    if (!ready) {
      const transcript = episode.artifacts.some(artifact => ['transcript_txt', 'transcript_json'].includes(artifact.type));
      const missingMetadata = !episode.title || !episode.publishedDate || !validOriginalUrl(episode.originalUrl);
      const nextAction = !transcript ? 'acquire_transcript' : !episode.notes.length ? 'produce_source_faithful_note' : 'resolve_qc_blockers';
      const priority = (episode.canonicalSourceType === 'official_rss' ? 100 : 40) + (episode.materiality === 'high' ? 20 : 0);
      queueStatement.run(episode.id, priority, episode.productionStatus, transcript ? 0 : 1, episode.notes.length ? 0 : 1,
        episode.notes.length && !episode.readiness.ready ? 1 : 0, missingMetadata ? 1 : 0, JSON.stringify(episode.readiness.reasons), nextAction, now);
    }
    ftsStatement.run(episode.id, episode.title, show.canonicalName, episode.description, episode.notes[0]?.text || '',
      episode.entities.map(entity => entity.name).join(' '), episode.themes.join(' '), episode.claims.map(claim => claim.claim).join(' '));
  }
  const completedCounts = { ...builder.counts, inventoryFiles: inventory.totals.files, canonicalEpisodes: builder.episodes.size,
    readyEpisodes: [...builder.episodes.values()].filter(episode => episode.readiness.ready).length };
  db.prepare(`UPDATE ingest_runs SET completed_at=?,status='completed',source_counts=?,inserted=?,updated=?,deduped=?,warnings=? WHERE id=?`).run(
    now, JSON.stringify(completedCounts), run.insertedEpisodes, builder.episodes.size - run.insertedEpisodes, builder.mergeLedger.length, builder.warnings.length, run.id);
  return completedCounts;
}

function reportsFromDatabase(db, builder, inventory, counts, options, run) {
  const reportsDir = path.resolve(options.reportsDir || DEFAULT_REPORTS_DIR); const repository = new LibraryRepository(db);
  const coverage = repository.coverage({ since: builder.since });
  const ingestReport = { generatedAt: new Date().toISOString(), ingestRunId: run.id, since: builder.since, selectedShows: options.shows || [],
    sourceRoots: run.sourceRoots, counts: { ...counts, insertedEpisodes: run.insertedEpisodes }, warnings: builder.warnings,
    candidateReview: builder.candidateReview, readiness: repository.audit(), genericDiscovery: inventory.discovered };
  const mergeReport = { generatedAt: new Date().toISOString(), since: builder.since, merges: builder.mergeLedger,
    candidateReview: builder.candidateReview, identityOrder: ['rss_guid', 'youtube_id', 'canonical_url', 'enclosure_url', 'show_episode_number', 'show_date_title'] };
  writeJson(path.join(reportsDir, 'podcast_ingest_report.json'), ingestReport);
  writeJson(path.join(reportsDir, 'podcast_merge_ledger.json'), mergeReport);
  writeJson(path.join(reportsDir, `podcast_coverage_since_${builder.since}.json`), coverage);
  return { inventory, ingest: ingestReport, merge: mergeReport, coverage };
}

function rebuildLibrary(options = {}) {
  const config = { dbPath: path.resolve(options.dbPath || DEFAULT_DB_PATH), radarRoot: path.resolve(options.radarRoot || DEFAULT_RADAR_ROOT),
    queriesRoot: path.resolve(options.queriesRoot || DEFAULT_QUERIES_ROOT), rawReportsRoot: path.resolve(options.rawReportsRoot || DEFAULT_RAW_REPORTS_ROOT),
    reportsDir: path.resolve(options.reportsDir || DEFAULT_REPORTS_DIR), since: options.since || DEFAULT_SINCE, shows: options.shows || [] };
  if (!validDate(config.since)) throw new Error(`invalid cutoff date: ${config.since}`);
  const inventory = inventoryAssets(config); const builder = new EpisodeBuilder(config);
  importOfficialRss(builder, config.radarRoot);
  importYoutubeSources(builder, config.radarRoot);
  importCandidates(builder, config.radarRoot);
  importRadarArchive(builder, config.radarRoot);
  importIltbNotes(builder, config.queriesRoot);
  importIltbRawArtifacts(builder, config.rawReportsRoot);
  importIltbClaims(builder, config.queriesRoot);
  const generic = genericHistoricalDiscovery(config.queriesRoot); builder.counts.genericReviewed = generic.reviewed.length; builder.counts.genericExcluded = generic.exclusions.length;
  canonicalize(builder);
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  let previousIds = new Set();
  if (exists(config.dbPath)) {
    let previous;
    try { previous = openDatabase(config.dbPath, { readOnly: true }); previousIds = new Set(previous.prepare('SELECT id FROM episodes').all().map(row => row.id)); }
    catch (_) { previousIds = new Set(); } finally { previous?.close(); }
  }
  const staging = `${config.dbPath}.staging-${process.pid}`; fs.rmSync(staging, { force: true });
  const run = { id: stableId('ingest', `${new Date().toISOString()}:${process.pid}`), startedAt: new Date().toISOString(),
    sourceRoots: [config.radarRoot, config.queriesRoot, config.rawReportsRoot], insertedEpisodes: [...builder.episodes.keys()].filter(id => !previousIds.has(id)).length };
  let db;
  try {
    db = openDatabase(staging, { journalMode: 'DELETE' }); migrateDatabase(db);
    db.exec('BEGIN IMMEDIATE');
    let counts;
    try { counts = insertBuilder(db, builder, run, inventory); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
    const verification = verifyDatabase(db); if (!verification.ok) throw new Error(`staged database verification failed: ${JSON.stringify(verification)}`);
    if (typeof options.validateStaged === 'function') options.validateStaged(db, { ...counts, insertedEpisodes: run.insertedEpisodes });
    const reports = reportsFromDatabase(db, builder, inventory, counts, config, run);
    db.close(); db = null;
    fs.rmSync(`${config.dbPath}-wal`, { force: true }); fs.rmSync(`${config.dbPath}-shm`, { force: true });
    fs.renameSync(staging, config.dbPath);
    return { dbPath: config.dbPath, counts: { ...counts, insertedEpisodes: run.insertedEpisodes }, inventory, reports, verification };
  } catch (error) {
    try { db?.close(); } catch (_) {}
    fs.rmSync(staging, { force: true }); throw error;
  }
}

function verifyLibrary(options = {}) {
  const dbPath = path.resolve(options.dbPath || DEFAULT_DB_PATH); const reportsDir = path.resolve(options.reportsDir || DEFAULT_REPORTS_DIR);
  const db = openDatabase(dbPath, { readOnly: true });
  try {
    const database = verifyDatabase(db); const missingArtifacts = []; const hashMismatches = [];
    for (const row of db.prepare(`SELECT a.id,a.origin_path,a.sha256 FROM artifacts a JOIN note_versions n ON n.artifact_id=a.id WHERE n.canonical=1`).all()) {
      if (!exists(row.origin_path)) missingArtifacts.push(row.id);
      else if (sha256(fs.readFileSync(row.origin_path)) !== row.sha256) hashMismatches.push(row.id);
    }
    const reportFiles = ['podcast_asset_inventory.json', 'podcast_ingest_report.json', 'podcast_merge_ledger.json', `podcast_coverage_since_${options.since || DEFAULT_SINCE}.json`];
    const missingReports = reportFiles.filter(file => !exists(path.join(reportsDir, file)));
    const repository = new LibraryRepository(db); const audit = repository.audit(); const coverage = repository.coverage({ since: options.since || DEFAULT_SINCE });
    const result = { ok: database.ok && !missingArtifacts.length && !hashMismatches.length && !missingReports.length,
      database, missingArtifacts, hashMismatches, missingReports, audit, coverage };
    if (!result.ok && options.throwOnError !== false) throw new Error(`library verification failed: ${JSON.stringify(result)}`);
    return result;
  } finally { db.close(); }
}

function exportSanitizedSnapshot(options = {}) {
  const dbPath = path.resolve(options.dbPath || DEFAULT_DB_PATH);
  const outputPath = path.resolve(options.outputPath || path.join(APP_DIR, 'data', 'public', 'podcast_library_snapshot.json'));
  const db = openDatabase(dbPath, { readOnly: true });
  try {
    const repository = new LibraryRepository(db, { publicMode: true }); const library = repository.library({ limit: 100, offset: 0 });
    const sanitize = value => String(value || '')
      .replace(/\/Users\/[^\s`'"<>)]*/g, '[private-source]')
      .replace(/file:\/\/[^\s`'"<>)]*/gi, '[private-source]')
      .replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/gi, 'https://')
      .replace(/claim[-_ ]ledger(?:[-_.\/\w]*)?/gi, 'private-evidence-ledger')
      .replace(/(?:transcript_txt|audio_url|origin_path|production_queue)/gi, 'private-field');
    const episodes = library.episodes.map(summary => {
      const detail = repository.episode(summary.id);
      return { id: detail.id, showId: detail.showId, show: detail.show, title: detail.title, publishedAt: detail.publishedAt,
        publishedDate: detail.publishedDate, durationSeconds: detail.durationSeconds, duration: detail.duration, description: sanitize(detail.description),
        originalUrl: detail.originalUrl, mediaType: detail.mediaType, materiality: detail.materiality, productionStatus: detail.productionStatus,
        readerReady: detail.readerReady, publicReady: detail.publicReady, gateVersion: detail.gateVersion, noteMarkdown: sanitize(detail.noteMarkdown),
        sourceBoundary: sanitize(detail.sourceBoundary), whyItMatters: sanitize(detail.whyItMatters), themes: detail.themes, entities: detail.entities,
        noteVersions: detail.noteVersions.map(version => ({ versionLabel: version.versionLabel, writingStyle: version.writingStyle, charCount: version.charCount,
          language: version.language, canonical: version.canonical, superseded: version.superseded })) };
    });
    if (episodes.some(episode => !episode.readerReady || !episode.publicReady || episode.gateVersion !== LIBRARY_GATE_VERSION)) throw new Error('ready-only snapshot invariant failed');
    const snapshot = { format: 'podcast-library-sanitized-v1', generatedAt: new Date().toISOString(), gateVersion: LIBRARY_GATE_VERSION,
      counts: { episodes: episodes.length }, audit: repository.audit(), episodes, shows: repository.state().shows.map(show => ({ id: show.id, name: show.name, slug: show.slug,
        tier: show.tier, readyCount: show.readyCount })), coverage: repository.coverage() };
    const serialized = JSON.stringify(snapshot, null, 2);
    if (/\/Users\/|origin_path|production_queue|transcript_txt|audio_url|claim_ledger/i.test(serialized)) throw new Error('snapshot privacy invariant failed');
    writeJson(outputPath, snapshot); return snapshot;
  } finally { db.close(); }
}

module.exports = { LIBRARY_GATE_VERSION, DEFAULT_SINCE, DEFAULT_RADAR_ROOT, DEFAULT_QUERIES_ROOT, DEFAULT_RAW_REPORTS_ROOT, DEFAULT_REPORTS_DIR,
  parseRss, cleanUrl, officialRssEpisodeSourceUrl, inventoryAssets, genericHistoricalDiscovery, evaluateLibraryReadiness, rebuildLibrary, verifyLibrary, exportSanitizedSnapshot,
  sourceBoundaryFromNote, whyItMattersFromNote, guestEntity };
