const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CORE_SHOWS, extractEntities, classifySource, sameSourceIdentity, stripInvisibleUnicode, computeRouting } = require('./intelligence');

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function exists(file) { try { return fs.existsSync(file); } catch (_) { return false; } }
function listDirs(root) {
  if (!exists(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e => e.name).sort().reverse();
}
function shortHash(value) { return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12); }
function compactText(value, limit = 360) { return stripInvisibleUnicode(value).replace(/\s+/g, ' ').trim().slice(0, limit); }
function stripMd(value) {
  return stripInvisibleUnicode(value).replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]{1,3}/g, '').replace(/^#+\s*/gm, '').replace(/<[^>]+>/g, '').trim();
}

const PUBLICATION_GATE_VERSION = 'presentation-ready-v1';
const MIN_SOURCE_NOTE_CHARS = 800;
const MIN_WHY_IT_MATTERS_CHARS = 60;
const PLACEHOLDER_TEXT = /^(?:暂无|尚未|未提供|未生成|待补充|待完善|占位|无内容|unknown|not available|n\/?a|placeholder|error|failed)(?:[\s：:。.！!-]|$)/i;

function meaningfulText(value, minimum) {
  const text = stripMd(value).replace(/\s+/g, ' ').trim();
  return text.length >= minimum && !PLACEHOLDER_TEXT.test(text);
}
function validOriginalUrl(value) {
  try { const url = new URL(String(value || '')); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; }
  catch (_) { return false; }
}
function usableDate(value) {
  const match = String(value || '').match(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/);
  if (!match) return false;
  const date = new Date(`${match[0]}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === match[0];
}
function qcArtifactPasses(qc) {
  if (!qc || typeof qc !== 'object' || Array.isArray(qc) || !Object.keys(qc).length) return false;
  if (qc.passed === false || qc.exists === false || /(?:fail|error|invalid|reject)/i.test(String(qc.status || ''))) return false;
  if (qc.passed === true || /(?:pass|success|ok|complete)/i.test(String(qc.status || ''))) return true;
  const paragraphs = Number(qc.nonempty_paragraphs ?? qc.paragraph_count ?? qc.paragraphs ?? 0);
  const bytes = Number(qc.bytes ?? 0);
  const markdownChars = Number(qc.md_chars ?? 0);
  return paragraphs >= 3 || bytes >= 256 || markdownChars >= MIN_SOURCE_NOTE_CHARS;
}
function evaluatePublicationReadiness(episode, noteText = '') {
  const reasons = [];
  const note = String(noteText || '');
  const notePlain = stripMd(note).replace(/\s+/g, ' ').trim();
  if (episode.productionStatus !== 'qc_passed') reasons.push('production_status_not_qc_passed');
  if (!episode.notePath && !note) reasons.push('source_note_missing');
  else if (notePlain.length < MIN_SOURCE_NOTE_CHARS) reasons.push('source_note_too_short');
  else if (PLACEHOLDER_TEXT.test(notePlain)) reasons.push('source_note_placeholder');
  else if (/(?:excerpt[- ]only|仅(?:为|含)?(?:摘录|摘要)|discovery[- ]only)/i.test(notePlain.slice(0, 500))) reasons.push('source_note_excerpt_only');
  else if ((notePlain.match(/[\u3400-\u9fff]/g) || []).length < 80) reasons.push('source_note_not_substantive_chinese');
  else if (/(?:transcript|fetch|generation|生成|抓取).{0,24}(?:failed|error|失败)/i.test(notePlain.slice(0, 800))) reasons.push('source_note_error_text');
  if (!episode.qcPath) reasons.push('qc_artifact_missing');
  else if (!qcArtifactPasses(episode.qcSummary)) reasons.push('qc_artifact_failed');
  if (!meaningfulText(episode.whyItMatters, MIN_WHY_IT_MATTERS_CHARS)) reasons.push('why_it_matters_missing_or_placeholder');
  if (!meaningfulText(episode.transcriptBoundary, 12)) reasons.push('transcript_boundary_missing');
  if (!validOriginalUrl(episode.originalUrl)) reasons.push('original_source_url_invalid');
  if (!meaningfulText(episode.title, 4) || /^(?:未命名|unknown|untitled)/i.test(String(episode.title))) reasons.push('title_unusable');
  if (!meaningfulText(episode.show, 2) || /^(?:未知节目|unknown|untitled)/i.test(String(episode.show))) reasons.push('show_unusable');
  if (!usableDate(episode.publishedAt || episode.dateDetected)) reasons.push('date_unusable');
  if (episode.noteMetadataShow && !sameSourceIdentity(episode.show, episode.noteMetadataShow)) reasons.push('note_show_identity_mismatch');
  if (episode.sourceUrlShow && !sameSourceIdentity(episode.show, episode.sourceUrlShow)) reasons.push('source_url_show_identity_mismatch');
  if (episode.noteMetadataShow && episode.sourceUrlShow && !sameSourceIdentity(episode.noteMetadataShow, episode.sourceUrlShow)) reasons.push('note_source_show_identity_mismatch');
  if (episode.noteSourceUrl && canonicalUrl(episode.noteSourceUrl) !== canonicalUrl(episode.originalUrl)) reasons.push('note_source_url_identity_mismatch');
  return { ready: reasons.length === 0, reasons, gateVersion: PUBLICATION_GATE_VERSION };
}

const TITLE_STOP = new Set(['the', 'and', 'with', 'from', 'this', 'that', 'podcast', 'show', 'episode', 'how', 'why', 'what', 'for']);
function normalizeTitle(value) {
  return stripInvisibleUnicode(value).normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(t => t && !TITLE_STOP.has(t)).join(' ');
}
function videoId(value) {
  const s = String(value || '');
  const match = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/))([\w-]{6,})/i);
  return match ? match[1] : '';
}
function canonicalUrl(value) {
  const yt = videoId(value);
  if (yt) return `youtube:${yt}`;
  try {
    const u = new URL(String(value));
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|ref$|source$|si$|t$)/i.test(key)) u.searchParams.delete(key);
    return `${u.hostname.replace(/^www\./, '').toLowerCase()}${u.pathname.replace(/\/$/, '')}${u.search}`;
  } catch (_) { return String(value || '').trim().toLowerCase(); }
}

function extractThemes(text) {
  const t = String(text || '').toLowerCase();
  const rules = [
    ['AI Infra', /(gpu|hbm|memory|semiconductor|datacenter|data center|cloud|nvidia|amd|cerebras|芯片|算力|infra|服务器|ai factory)/],
    ['Edge AI', /(edge|on-device|device-native|wearable|npu|边缘|端侧|robot|机器人)/],
    ['Model Architecture', /(architecture|transformer|state[- ]space|foundation model|distillation|open source|open model|frontier model|agi|架构|模型|蒸馏)/],
    ['AI Agents', /(agent|agents|copilot|workflow|tool use|orchestrat|智能体|代理)/],
    ['Enterprise AI', /(enterprise|salesforce|customer|forward[- ]deployed|arr|token budget|企业|客户|商业化)/],
    ['Venture / Pre-IPO', /(vc|venture|startup|valuation|funding|sequoia|benchmark|ipo|pre-ipo|融资|估值|一级)/],
    ['Markets / Macro', /(market|macro|rates|inflation|fed|treasury|equity|credit|oil|crypto|bitcoin|btc|eth|etf|市场|宏观|利率)/],
    ['Product / GTM', /(product|growth|gtm|distribution|sales|pricing|monetization|pmf|产品|增长|定价|商业模式)/],
  ];
  const found = rules.filter(([, re]) => re.test(t)).map(([label]) => label);
  return found.slice(0, 5);
}

function parseDailyMarkdownItems(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const items = [];
  let current = null;
  const flush = () => {
    if (!current || !current.title) return;
    current.description = compactText(current.whyItMatters || current.sourceBoundary, 420);
    items.push(current);
  };
  for (const line of lines) {
    const item = line.match(/^\s*\d+[.)]\s+(?:\*\*)?(.+?)(?:\*\*)?\s*$/);
    if (item) { flush(); current = { title: stripMd(item[1]).replace(/[：:]$/, ''), show: '', url: '', published: '', whyItMatters: '', sourceBoundary: '' }; continue; }
    if (!current) continue;
    if (/^#\s+/.test(line) || /^\s*---\s*$/.test(line)) { flush(); current = null; continue; }
    const kv = line.match(/^\s*-\s*([^：:]+)[：:]\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim(); const value = stripMd(kv[2]);
    if (/boundary|边界|transcript/i.test(key)) current.sourceBoundary = value;
    else if (/来源|source/i.test(key)) current.show = value;
    else if (/URL|链接|视频|url/i.test(key)) current.url = value;
    else if (/发布|时间|published/i.test(key)) current.published = value;
    else if (/为什么|重要|投资研究用户/i.test(key)) current.whyItMatters = value;
  }
  flush();
  return items;
}

function findAllRecursive(dir, predicate, out = []) {
  if (!exists(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) findAllRecursive(file, predicate, out);
    else if (predicate(file, ent.name)) out.push(file);
  }
  return out;
}
function firstFile(dir, patterns) {
  if (!exists(dir)) return null;
  const names = fs.readdirSync(dir).filter(name => patterns.some(re => re.test(name))).sort((a, b) => {
    const score = n => (/timestamped/i.test(n) ? 0 : /plain/i.test(n) ? 1 : 2);
    return score(a) - score(b) || a.localeCompare(b);
  });
  return names[0] ? path.join(dir, names[0]) : null;
}
function noteFacts(note) {
  const text = String(note || '');
  const heading = (text.match(/^#\s+(.+)$/m) || [])[1] || '';
  const rawField = names => {
    const re = new RegExp(`^-\\s*(?:\\*\\*)?(?:${names})(?:\\*\\*)?[：:]\\s*(.+)$`, 'mi');
    return (text.match(re) || [])[1] || '';
  };
  const field = names => stripMd(rawField(names));
  const section = names => compactText((text.match(new RegExp(`^##\\s+(?:${names})[^\\n]*\\n+([\\s\\S]{0,1400}?)(?=\\n#{1,2}\\s|\\n---|$)`, 'mi')) || [])[1], 560);
  return {
    title: field('原题|Original title') || stripMd(heading).replace(/[：:]?.{0,12}深度纪要.*$/i, '').trim(),
    show: field('来源|节目 \/ 嘉宾|节目|Source'),
    url: stripInvisibleUnicode(rawField('视频|URL|链接')).match(/https?:\/\/\S+/)?.[0] || '',
    publishedAt: field('发布日期|发布时间'),
    sourceBoundary: field('Source boundary|来源边界'),
    whyItMatters: section('(?:一页定位[：:]?\\s*)?为什么|一页导读|核心定位(?:与[^\\n]*)?|对\\s*投资研究用户\\s*的投资相关性'),
  };
}

function youtubeSourceRecords(state = {}) {
  const processed = Array.isArray(state.processed) ? state.processed : Object.values(state.processed || {});
  const sources = Object.entries(state.youtube_sources || state.youtubeSources || {});
  const records = new Map();
  const record = (id, value) => {
    const previous = records.get(id);
    if (!previous || value.rank > previous.rank) records.set(id, value);
    else if (value.rank === previous.rank && !sameSourceIdentity(value.show, previous.show)) records.set(id, { conflict: true, rank: value.rank });
  };
  for (const item of processed) {
    const id = item?.video_id || videoId(item?.url);
    if (!id || !item.show) continue;
    record(id, { show: item.show, sourceKey: item.source_key || `youtube:${item.show}`, channelId: item.channel_id || '', evidence: 'processed_state', rank: 50 });
  }
  for (const [sourceKey, source] of sources) {
    if (!source?.last_raw_path || !exists(source.last_raw_path)) continue;
    const xml = fs.readFileSync(source.last_raw_path, 'utf8');
    for (const match of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) {
      const entry = match[1];
      const id = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i) || [])[1] || '';
      const channelId = (entry.match(/<yt:channelId>([^<]+)<\/yt:channelId>/i) || [])[1] || '';
      const author = stripMd((entry.match(/<author\b[^>]*>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i) || [])[1] || '');
      if (!id || !channelId || channelId !== String(source.channel_id || '') || (author && !sameSourceIdentity(author, sourceKey))) continue;
      record(id, { show: author || sourceKey, sourceKey: `youtube:${sourceKey}`, channelId, evidence: 'official_youtube_feed', rank: 100 });
    }
  }
  return records;
}
function normalizeYoutubeRecord(record, sources) {
  const id = record?.video_id || record?.videoId || videoId(record?.url);
  const source = id ? sources.get(id) : null;
  if (!source || source.conflict) return record;
  return { ...record, show: source.show, channel: source.show, source_key: source.sourceKey, sourceKey: source.sourceKey,
    sourceUrlShow: source.show, youtubeChannelId: source.channelId, youtubeIdentityEvidence: source.evidence };
}

function scanArtifacts(dayDir) {
  const files = findAllRecursive(dayDir, (_, name) => ['metadata.json', 'source_manifest.json', 'notes_cn_source_faithful.md'].includes(name));
  const dirs = [...new Set(files.map(path.dirname))];
  return dirs.map(dir => {
    const metadataPath = exists(path.join(dir, 'metadata.json')) ? path.join(dir, 'metadata.json') : null;
    const sourceManifestPath = exists(path.join(dir, 'source_manifest.json')) ? path.join(dir, 'source_manifest.json') : null;
    const notePath = exists(path.join(dir, 'notes_cn_source_faithful.md')) ? path.join(dir, 'notes_cn_source_faithful.md') : null;
    const metadata = metadataPath ? readJson(metadataPath, {}) : {};
    const note = notePath ? fs.readFileSync(notePath, 'utf8') : '';
    const facts = noteFacts(note);
    const transcriptPath = firstFile(dir, [/^transcript_timestamped.*\.(txt|md)$/i, /^transcript_plain.*\.(txt|md)$/i, /^transcript.*\.json$/i]);
    const docxPath = firstFile(dir, [/^notes_cn_source_faithful\.docx$/i]);
    const qcPath = firstFile(dir, [/^notes_cn_source_faithful\.qc\.json$/i]);
    const pdfPath = firstFile(dir, [/^notes_cn_source_faithful\.pdf$/i]);
    const investmentExtractionPath = firstFile(dir, [/^investment[_-]extraction.*\.(md|json)$/i]);
    const audioPath = firstFile(dir, [/\.(mp3|m4a|wav)$/i]);
    if (!notePath && !transcriptPath) return null;
    return {
      dir, metadataPath, sourceManifestPath, notePath, transcriptPath, docxPath, qcPath, pdfPath, audioPath, investmentExtractionPath,
      metadata, noteChars: note.length,
      candidateId: metadata.candidate_id || metadata.candidateId || '',
      videoId: metadata.video_id || videoId(metadata.url || facts.url),
      title: metadata.title || facts.title || path.basename(dir).replace(/[_-]+/g, ' '),
      show: metadata.show || metadata.source || metadata.channel || facts.show || '',
      url: metadata.url || facts.url || '',
      publishedAt: metadata.published || metadata.published_at || facts.publishedAt || '',
      sourceBoundary: metadata.source_boundary || metadata.transcript_boundary || facts.sourceBoundary || '',
      transcriptBoundary: metadata.source_boundary || metadata.transcript_boundary || facts.sourceBoundary || metadata.transcript_status || '',
      transcriptStatusRaw: metadata.transcript_status || '', duration: metadata.duration_approx || metadata.duration || metadata.duration_sec || '',
      whyItMatters: facts.whyItMatters,
      noteMetadataShow: facts.show, noteSourceUrl: facts.url,
      qc: qcPath ? readJson(qcPath, {}) : null,
    };
  }).filter(Boolean);
}

function titleScore(a, b) {
  const aa = new Set(normalizeTitle(a).split(' ').filter(Boolean));
  const bb = new Set(normalizeTitle(b).split(' ').filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  const common = [...aa].filter(t => bb.has(t)).length;
  return Math.max(common / aa.size, common / bb.size) * (common >= 2 ? 1 : 0.5);
}
function matchArtifact(candidate, artifacts, used) {
  const cid = String(candidate.id || ''); const cvid = candidate.video_id || videoId(candidate.url);
  let found = artifacts.find((a, i) => !used.has(i) && ((a.candidateId && a.candidateId === cid) || (cvid && a.videoId === cvid)));
  if (found) return artifacts.indexOf(found);
  const curl = canonicalUrl(candidate.url);
  if (curl) {
    found = artifacts.find((a, i) => !used.has(i) && a.url && canonicalUrl(a.url) === curl);
    if (found) return artifacts.indexOf(found);
  }
  let best = -1; let bestScore = 0;
  artifacts.forEach((a, i) => {
    if (used.has(i)) return;
    const score = titleScore(candidate.title, a.title);
    const sameShow = !candidate.show || !a.show || normalizeTitle(candidate.show) === normalizeTitle(a.show);
    if (sameShow && score > bestScore) { best = i; bestScore = score; }
  });
  return bestScore >= 0.6 ? best : -1;
}
function productionStatus(candidate, artifact) {
  if (artifact?.qcPath) return 'qc_passed';
  if (artifact?.notePath) return 'note_ready';
  if (artifact?.transcriptPath) return 'transcript_ready';
  return /selected|processing|chosen/i.test(candidate?.status || '') ? 'selected' : 'new';
}
function makeEpisode(date, candidate = {}, artifact = null, artifactOnly = false, sourceTierHint = '') {
  const title = candidate.title || artifact?.title || '未命名节目';
  const originalUrl = candidate.url || artifact?.url || '';
  const candidateId = candidate.id || '';
  const stable = candidateId || artifact?.videoId || canonicalUrl(originalUrl) || `${date}:${normalizeTitle(title)}:${artifact?.dir || ''}`;
  const description = compactText(candidate.description || '', 560);
  const noteText = artifact?.notePath ? fs.readFileSync(artifact.notePath, 'utf8') : '';
  const metadataText = artifact?.metadata ? JSON.stringify(artifact.metadata) : '';
  const whyItMatters = artifact?.whyItMatters || '';
  const themes = extractThemes([title, candidate.show, description, whyItMatters, noteText.slice(0, 5000)].join(' '));
  const status = productionStatus(candidate, artifact);
  const source = classifySource(candidate.show || artifact?.show || '未知节目', sourceTierHint);
  const entities = extractEntities({ title, description: [description, whyItMatters].join(' '), note: noteText, metadata: metadataText });
  const episode = {
    id: `${date}-${shortHash(stable)}`, candidateId, dateDetected: date, date,
    title, show: candidate.show || artifact?.show || '未知节目', sourceKey: candidate.source_key || '', mediaType: candidate.type || (artifact?.videoId ? 'youtube' : 'unknown'),
    publishedAt: candidate.published || artifact?.publishedAt || '', originalUrl, audioUrl: candidate.audio_url || '', description,
    materiality: candidate.materiality || 'unknown', candidateStatus: candidate.status || (artifactOnly ? 'artifact_only' : 'new_detected'), productionStatus: status,
    transcriptStatus: artifact?.transcriptPath ? 'ready' : 'missing', transcriptBoundary: artifact?.transcriptBoundary || '', duration: artifact?.duration || '', themes,
    whyItMatters, noteChars: artifact?.noteChars || 0, qcPassed: qcArtifactPasses(artifact?.qc), qcSummary: artifact?.qc || null,
    entities, sourceTier: source.tier, sourceQualityLabel: source.label,
    artifactOnly, videoId: candidate.video_id || artifact?.videoId || videoId(originalUrl),
    notePath: artifact?.notePath || null, transcriptPath: artifact?.transcriptPath || null, docxPath: artifact?.docxPath || null, pdfPath: artifact?.pdfPath || null,
    qcPath: artifact?.qcPath || null, metadataPath: artifact?.metadataPath || null, sourceManifestPath: artifact?.sourceManifestPath || null,
    metadata: artifact?.metadata || null, audioPath: artifact?.audioPath || null, investmentExtractionPath: artifact?.investmentExtractionPath || null,
    noteMetadataShow: artifact?.noteMetadataShow || '', noteSourceUrl: artifact?.noteSourceUrl || '',
    sourceUrlShow: candidate.sourceUrlShow || artifact?.sourceUrlShow || '', youtubeChannelId: candidate.youtubeChannelId || artifact?.youtubeChannelId || '',
  };
  Object.assign(episode, computeRouting(episode));
  episode.publicationQc = evaluatePublicationReadiness(episode, noteText);
  episode.presentationReady = episode.publicationQc.ready;
  episode.publicReady = episode.publicationQc.ready;
  return episode;
}

function candidateRows(dayDir) {
  const candidates = readJson(path.join(dayDir, 'candidates.json'), null);
  if (Array.isArray(candidates)) return candidates;
  const scan = readJson(path.join(dayDir, 'scan_report.json'), {});
  const rows = Array.isArray(scan.new_high) && scan.new_high.length ? scan.new_high : Array.isArray(scan.new) ? scan.new : [];
  if (rows.length) return rows;
  const daily = fs.readdirSync(dayDir).find(n => /^daily_podcast_radar_(notes|report)_.*\.md$/.test(n));
  return daily ? parseDailyMarkdownItems(fs.readFileSync(path.join(dayDir, daily), 'utf8')).map((r, i) => ({ ...r, id: `legacy-${i}`, status: 'new_detected' })) : [];
}
function dedupeCandidates(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = row.video_id ? `youtube:${row.video_id}` : canonicalUrl(row.url) || `id:${row.id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function buildIndex(rootDir) {
  const root = path.resolve(rootDir);
  const sourceState = readJson(path.join(root, 'state.json'), { sources: {} });
  const youtubeSources = youtubeSourceRecords(sourceState);
  const episodes = []; const productionDays = [];
  for (const date of listDirs(root)) {
    const dayDir = path.join(root, date);
    const candidates = dedupeCandidates(candidateRows(dayDir).map(candidate => normalizeYoutubeRecord(candidate, youtubeSources)));
    const artifacts = scanArtifacts(dayDir).map(artifact => normalizeYoutubeRecord(artifact, youtubeSources)); const used = new Set(); const dayEpisodes = [];
    for (const candidate of candidates) {
      const match = matchArtifact(candidate, artifacts, used);
      const artifact = match >= 0 ? artifacts[match] : null;
      if (match >= 0) used.add(match);
      const source = sourceState.sources?.[candidate.source_key] || Object.values(sourceState.sources || {}).find(value => normalizeTitle(value.show_title || value.collectionName) === normalizeTitle(candidate.show));
      dayEpisodes.push(makeEpisode(date, candidate, artifact, false, source?.tier || ''));
    }
    artifacts.forEach((artifact, i) => {
      if (used.has(i)) return;
      const source = Object.values(sourceState.sources || {}).find(value => normalizeTitle(value.show_title || value.collectionName) === normalizeTitle(artifact.show));
      dayEpisodes.push(makeEpisode(date, {}, artifact, true, source?.tier || ''));
    });
    episodes.push(...dayEpisodes);
    const counts = statusCounts(dayEpisodes);
    const scan = readJson(path.join(dayDir, 'scan_report.json'), {});
    productionDays.push({ date, itemCount: dayEpisodes.length, candidateCount: candidates.length, highMaterialityCount: candidates.filter(c => c.materiality === 'high').length, lowInformationCount: dayEpisodes.filter(e => e.lowInformation).length, ...counts, themes: [...new Set(dayEpisodes.flatMap(e => e.themes))], itemIds: dayEpisodes.map(e => e.id), updatedAt: scan.now || null });
  }
  const readyEpisodes = episodes.filter(episode => episode.publicReady);
  const days = productionDays.map(day => {
    const related = readyEpisodes.filter(episode => episode.dateDetected === day.date);
    return { date: day.date, itemCount: related.length, highMaterialityCount: related.filter(e => e.materiality === 'high').length, ...statusCounts(related), themes: [...new Set(related.flatMap(e => e.themes))], itemIds: related.map(e => e.id), updatedAt: day.updatedAt };
  }).filter(day => day.itemCount > 0);
  const sourceRows = [
    ...CORE_SHOWS.map(show => [show.id, { show_title: show.name, coreRegistry: true }]),
    ...Object.entries(sourceState.sources || {}),
    ...readyEpisodes.map(episode => [episode.sourceKey || `episode:${episode.show}`, { show_title: episode.show }]),
  ];
  const sourceMap = new Map();
  for (const [key, source] of sourceRows) {
    const title = source.show_title || source.collectionName || key;
    const classification = classifySource(title, source.tier || '');
    const canonicalKey = classification.tier === 'core' ? classification.sourceId : normalizeTitle(title);
    const previous = sourceMap.get(canonicalKey) || {};
    sourceMap.set(canonicalKey, { ...previous, ...source, key: previous.key || key, title: classification.sourceName || title, sourceTier: classification.tier, sourceQualityLabel: classification.label });
  }
  const sources = [...sourceMap.values()].map(source => {
    const related = readyEpisodes.filter(e => e.sourceKey === source.key || normalizeTitle(e.show) === normalizeTitle(source.title) || (source.sourceTier === 'core' && classifySource(e.show).sourceId === classifySource(source.title).sourceId));
    const recent = [...related].sort((a, b) => String(b.publishedAt || b.dateDetected).localeCompare(String(a.publishedAt || a.dateDetected)))[0];
    return { key: source.key, title: source.title, sourceTier: source.sourceTier, sourceQualityLabel: source.sourceQualityLabel, lastScanAt: source.last_scan_at || null, episodeCount: related.length, noteCount: related.length, latestEpisode: recent?.title || '', health: source.last_status === 200 ? '正常' : source.last_status == null ? '无近期更新' : '待检查' };
  }).sort((a, b) => ({ core: 0, priority: 1, standard: 2 }[a.sourceTier] - { core: 0, priority: 1, standard: 2 }[b.sourceTier]) || a.title.localeCompare(b.title));
  const themes = [...new Set(readyEpisodes.flatMap(e => e.themes))].sort().map(label => ({ label, count: readyEpisodes.filter(e => e.themes.includes(label)).length }));
  const entities = [...new Map(readyEpisodes.flatMap(episode => episode.entities).map(entity => [entity.id, entity])).values()].map(entity => ({ id: entity.id, name: entity.name, type: entity.type, count: readyEpisodes.filter(episode => episode.entities.some(value => value.id === entity.id)).length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const reasonCounts = {};
  for (const episode of episodes) for (const reason of episode.publicationQc.reasons) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  const audit = { gateVersion: PUBLICATION_GATE_VERSION, totalIndexed: episodes.length, ready: readyEpisodes.length, blocked: episodes.length - readyEpisodes.length, reasonCounts: Object.fromEntries(Object.entries(reasonCounts).sort(([a], [b]) => a.localeCompare(b))) };
  return { generatedAt: new Date().toISOString(), root, days, productionDays, episodes, items: episodes, readyEpisodes, sources, themes, entities, audit, stats: { dayCount: days.length, episodeCount: readyEpisodes.length, itemCount: readyEpisodes.length, sourceCount: sources.length, lowInformationCount: readyEpisodes.filter(e => e.lowInformation).length } };
}
function statusCounts(episodes) {
  return {
    transcriptReadyCount: episodes.filter(e => e.transcriptStatus === 'ready').length,
    noteReadyCount: episodes.filter(e => ['note_ready', 'qc_passed'].includes(e.productionStatus)).length,
    qcPassedCount: episodes.filter(e => e.productionStatus === 'qc_passed').length,
  };
}
function safeResolvePodcastPath(rootDir, requestedPath) {
  if (!requestedPath) throw new Error('missing path');
  const rootLexical = path.resolve(rootDir); const lexical = path.resolve(String(requestedPath));
  if (!(lexical === rootLexical || lexical.startsWith(rootLexical + path.sep))) throw new Error('outside podcast archive');
  if (!exists(lexical)) throw new Error('file does not exist');
  const root = fs.realpathSync(rootLexical); const resolved = fs.realpathSync(lexical);
  if (!(resolved === root || resolved.startsWith(root + path.sep))) throw new Error('outside podcast archive');
  if (!fs.statSync(resolved).isFile()) throw new Error('not a file');
  return resolved;
}

module.exports = { extractThemes, parseDailyMarkdownItems, normalizeTitle, canonicalUrl, noteFacts, youtubeSourceRecords, buildIndex, safeResolvePodcastPath, readJson, statusCounts, evaluatePublicationReadiness, qcArtifactPasses, PUBLICATION_GATE_VERSION, MIN_SOURCE_NOTE_CHARS };
