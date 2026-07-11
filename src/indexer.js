const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function exists(file) { try { return fs.existsSync(file); } catch (_) { return false; } }
function listDirs(root) {
  if (!exists(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e => e.name).sort().reverse();
}
function shortHash(value) { return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12); }
function compactText(value, limit = 360) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit); }
function stripMd(value) {
  return String(value || '').replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]{1,3}/g, '').replace(/^#+\s*/gm, '').replace(/<[^>]+>/g, '').trim();
}

const TITLE_STOP = new Set(['the', 'and', 'with', 'from', 'this', 'that', 'podcast', 'show', 'episode', 'how', 'why', 'what', 'for']);
function normalizeTitle(value) {
  return String(value || '').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(t => t && !TITLE_STOP.has(t)).join(' ');
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
  return found.length ? found.slice(0, 5) : ['General'];
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
  const field = names => {
    const re = new RegExp(`^-\\s*(?:\\*\\*)?(?:${names})(?:\\*\\*)?[：:]\\s*(.+)$`, 'mi');
    return stripMd((text.match(re) || [])[1] || '');
  };
  return {
    title: field('原题|Original title') || stripMd(heading).replace(/[：:]?.{0,12}深度纪要.*$/i, '').trim(),
    show: field('来源|节目 \/ 嘉宾|节目|Source'),
    url: (field('视频|URL|链接') || '').match(/https?:\/\/\S+/)?.[0] || '',
    publishedAt: field('发布日期|发布时间'),
    sourceBoundary: field('Source boundary|来源边界'),
    whyItMatters: compactText((text.match(/##\s+(?:一页定位[：:]?)?为什么[^\n]*\n+([\s\S]{0,1000}?)(?=\n##|\n---)/i) || text.match(/##\s+核心定位\s*\n+([\s\S]{0,700}?)(?=\n##|\n---)/i) || [])[1], 500),
  };
}

function scanArtifacts(dayDir) {
  const files = findAllRecursive(dayDir, (_, name) => name === 'metadata.json' || name === 'notes_cn_source_faithful.md');
  const dirs = [...new Set(files.map(path.dirname))];
  return dirs.map(dir => {
    const metadataPath = exists(path.join(dir, 'metadata.json')) ? path.join(dir, 'metadata.json') : null;
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
      dir, metadataPath, notePath, transcriptPath, docxPath, qcPath, pdfPath, audioPath, investmentExtractionPath,
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
function makeEpisode(date, candidate = {}, artifact = null, artifactOnly = false) {
  const title = candidate.title || artifact?.title || '未命名节目';
  const originalUrl = candidate.url || artifact?.url || '';
  const candidateId = candidate.id || '';
  const stable = candidateId || artifact?.videoId || canonicalUrl(originalUrl) || `${date}:${normalizeTitle(title)}:${artifact?.dir || ''}`;
  const description = compactText(candidate.description || '', 560);
  const themes = extractThemes([title, candidate.show, description, artifact?.whyItMatters, artifact?.notePath ? fs.readFileSync(artifact.notePath, 'utf8').slice(0, 5000) : ''].join(' '));
  const status = productionStatus(candidate, artifact);
  return {
    id: `${date}-${shortHash(stable)}`, candidateId, dateDetected: date, date,
    title, show: candidate.show || artifact?.show || '未知节目', sourceKey: candidate.source_key || '', mediaType: candidate.type || (artifact?.videoId ? 'youtube' : 'unknown'),
    publishedAt: candidate.published || artifact?.publishedAt || '', originalUrl, audioUrl: candidate.audio_url || '', description,
    materiality: candidate.materiality || 'unknown', candidateStatus: candidate.status || (artifactOnly ? 'artifact_only' : 'new_detected'), productionStatus: status,
    transcriptStatus: artifact?.transcriptPath ? 'ready' : 'missing', transcriptBoundary: artifact?.transcriptBoundary || '', duration: artifact?.duration || '', themes,
    whyItMatters: artifact?.whyItMatters || description, noteChars: artifact?.noteChars || 0, qcPassed: Boolean(artifact?.qcPath), qcSummary: artifact?.qc || null,
    artifactOnly, videoId: candidate.video_id || artifact?.videoId || videoId(originalUrl),
    notePath: artifact?.notePath || null, transcriptPath: artifact?.transcriptPath || null, docxPath: artifact?.docxPath || null, pdfPath: artifact?.pdfPath || null,
    qcPath: artifact?.qcPath || null, metadataPath: artifact?.metadataPath || null, audioPath: artifact?.audioPath || null, investmentExtractionPath: artifact?.investmentExtractionPath || null,
  };
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
  const episodes = []; const days = [];
  for (const date of listDirs(root)) {
    const dayDir = path.join(root, date);
    const candidates = dedupeCandidates(candidateRows(dayDir));
    const artifacts = scanArtifacts(dayDir); const used = new Set(); const dayEpisodes = [];
    for (const candidate of candidates) {
      const match = matchArtifact(candidate, artifacts, used);
      const artifact = match >= 0 ? artifacts[match] : null;
      if (match >= 0) used.add(match);
      dayEpisodes.push(makeEpisode(date, candidate, artifact));
    }
    artifacts.forEach((artifact, i) => { if (!used.has(i)) dayEpisodes.push(makeEpisode(date, {}, artifact, true)); });
    episodes.push(...dayEpisodes);
    const counts = statusCounts(dayEpisodes);
    const scan = readJson(path.join(dayDir, 'scan_report.json'), {});
    days.push({ date, itemCount: dayEpisodes.length, candidateCount: candidates.length, highMaterialityCount: candidates.filter(c => c.materiality === 'high').length, ...counts, themes: [...new Set(dayEpisodes.flatMap(e => e.themes))], itemIds: dayEpisodes.map(e => e.id), updatedAt: scan.now || null });
  }
  const sources = Object.entries(sourceState.sources || {}).map(([key, source]) => {
    const related = episodes.filter(e => e.sourceKey === key || normalizeTitle(e.show) === normalizeTitle(source.show_title || key));
    return { key, title: source.show_title || source.collectionName || key, tier: source.tier || '未分类', lastScanAt: source.last_scan_at || null, candidateCount: related.filter(e => !e.artifactOnly).length, noteCount: related.filter(e => ['note_ready', 'qc_passed'].includes(e.productionStatus)).length, latestEpisode: related.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))[0]?.title || '', health: source.last_status === 200 ? '正常' : source.last_status == null ? '无近期更新' : '待检查' };
  }).sort((a, b) => a.title.localeCompare(b.title));
  const themes = [...new Set(episodes.flatMap(e => e.themes))].sort().map(label => ({ label, count: episodes.filter(e => e.themes.includes(label)).length }));
  return { generatedAt: new Date().toISOString(), root, days, episodes, items: episodes, sources, themes, stats: { dayCount: days.length, episodeCount: episodes.length, itemCount: episodes.length, sourceCount: sources.length } };
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

module.exports = { extractThemes, parseDailyMarkdownItems, normalizeTitle, canonicalUrl, buildIndex, safeResolvePodcastPath, readJson, statusCounts };
