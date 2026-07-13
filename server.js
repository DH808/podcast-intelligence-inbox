const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { buildIndex, safeResolvePodcastPath } = require('./src/indexer');

const APP_DIR = __dirname;
const PUBLIC_DIR = path.join(APP_DIR, 'public');

function stripBase(pathname, basePath = '') {
  const base = String(basePath || '').replace(/\/$/, '');
  if (base && (pathname === base || pathname.startsWith(base + '/'))) return pathname.slice(base.length) || '/';
  if (pathname === '/podcast' || pathname.startsWith('/podcast/')) return pathname.slice('/podcast'.length) || '/';
  return pathname;
}
function send(res, status, body, headers = {}) { res.writeHead(status, headers); res.end(body); }
function json(res, status, value) { send(res, status, JSON.stringify(value), { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); }
function mime(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav' })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}
function attachmentName(file) { return path.basename(file).replace(/[^\w.\-\u4e00-\u9fff]/g, '_'); }
function safeQc(qc) {
  if (!qc || typeof qc !== 'object') return null;
  const allowed = ['bytes', 'paragraph_count', 'table_count', 'nonempty_paragraphs', 'md_chars', 'heading_counts', 'page_cm', 'margins_cm', 'passed', 'status', 'summary'];
  return Object.fromEntries(allowed.filter(key => qc[key] != null).map(key => [key, qc[key]]));
}
function publicEpisode(episode, detail = false) {
  const value = {
    id: episode.id, candidateId: episode.candidateId, dateDetected: episode.dateDetected, title: episode.title, show: episode.show,
    sourceKey: episode.sourceKey, mediaType: episode.mediaType, publishedAt: episode.publishedAt, originalUrl: episode.originalUrl, audioUrl: episode.audioUrl,
    description: episode.description, materiality: episode.materiality, candidateStatus: episode.candidateStatus, productionStatus: episode.productionStatus,
    transcriptStatus: episode.transcriptStatus, transcriptBoundary: episode.transcriptBoundary, duration: episode.duration, themes: episode.themes,
    whyItMatters: episode.whyItMatters, noteChars: episode.noteChars, qcPassed: episode.qcPassed, artifactOnly: episode.artifactOnly,
    entities: episode.entities, sourceTier: episode.sourceTier, sourceQualityLabel: episode.sourceQualityLabel,
    routingLabel: episode.label, routingScore: episode.routingScore, routingReason: episode.routingReason,
    lowInformation: episode.lowInformation, todayVisible: episode.todayVisible, informationPending: episode.informationPending,
    files: { markdown: Boolean(episode.notePath), docx: Boolean(episode.docxPath), pdf: Boolean(episode.pdfPath), transcript: Boolean(episode.transcriptPath), audio: Boolean(episode.audioPath), qc: Boolean(episode.qcPath), investmentExtraction: Boolean(episode.investmentExtractionPath) },
  };
  if (detail) value.qcSummary = safeQc(episode.qcSummary);
  return value;
}
function readNote(episode) { return episode.notePath ? fs.readFileSync(episode.notePath, 'utf8') : ''; }
function readInvestmentExtraction(episode) {
  if (!episode.investmentExtractionPath) return null;
  const text = fs.readFileSync(episode.investmentExtractionPath, 'utf8');
  if (!/\.json$/i.test(episode.investmentExtractionPath)) return text;
  try { return JSON.parse(text); } catch (_) { return null; }
}
function matchQuery(episode, query, includeNote = false) {
  const q = String(query || '').trim().toLocaleLowerCase();
  if (!q) return true;
  let haystack = [episode.title, episode.show, episode.description, episode.whyItMatters, ...(episode.themes || []), ...(episode.entities || []).map(entity => entity.name)].join(' ').toLocaleLowerCase();
  if (includeNote && episode.notePath) haystack += ' ' + readNote(episode).toLocaleLowerCase();
  return haystack.includes(q);
}
function fileForKind(episode, kind) {
  return ({ markdown: episode.notePath, docx: episode.docxPath, pdf: episode.pdfPath, transcript: episode.transcriptPath, audio: episode.audioPath, qc: episode.qcPath, investment: episode.investmentExtractionPath })[kind] || null;
}
function parseBoundedInt(value, fallback, max) { const n = Number.parseInt(value, 10); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback; }

function createRequestHandler(options = {}) {
  const root = path.resolve(options.root || process.env.PODCAST_RADAR_ROOT || path.join(APP_DIR, 'data', 'archive'));
  const basePath = options.basePath ?? process.env.BASE_PATH ?? '';
  let cache = null; let cacheTime = 0;
  function getIndex(force = false) {
    if (force || !cache || Date.now() - cacheTime > 60_000) { cache = buildIndex(root); cacheTime = Date.now(); }
    return cache;
  }
  function safeFile(requested) {
    try { return { file: safeResolvePodcastPath(root, requested) }; }
    catch (error) { return { status: /outside/.test(error.message) ? 403 : 404, error: /outside/.test(error.message) ? 'file_access_denied' : 'file_not_found' }; }
  }
  function serveFile(res, file, disposition = true) {
    const headers = { 'content-type': mime(file), 'cache-control': 'private, max-age=60' };
    if (disposition) { const name = attachmentName(file); headers['content-disposition'] = `attachment; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`; }
    return send(res, 200, fs.readFileSync(file), headers);
  }
  function handleApi(req, res, pathname, url) {
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) return json(res, 405, { error: 'method_not_allowed' });
    try {
      if (pathname === '/api/health') return json(res, 200, { ok: true, generatedAt: getIndex().generatedAt });
      if (pathname === '/api/state') {
        const idx = getIndex(url.searchParams.get('refresh') === '1');
        const latest = idx.days[0] || null;
        const alerts = [];
        if (latest && latest.candidateCount === 0) alerts.push('最近日期尚未发现候选节目');
        const unhealthy = idx.sources.filter(source => source.health === '待检查').length;
        if (unhealthy) alerts.push(`${unhealthy} 个节目源待检查`);
        return json(res, 200, { generatedAt: idx.generatedAt, days: idx.days, episodes: idx.episodes.map(e => publicEpisode(e)), sources: idx.sources, themes: idx.themes, entities: idx.entities, stats: idx.stats, pipelineAlerts: alerts });
      }
      if (pathname === '/api/entities') {
        const idx = getIndex();
        return json(res, 200, { total: idx.entities.length, entities: idx.entities });
      }
      if (pathname === '/api/episodes') {
        const idx = getIndex(); let episodes = idx.episodes;
        const filters = Object.fromEntries(['date', 'status', 'theme', 'show', 'materiality', 'entity', 'sourceTier', 'lowInformation', 'q'].map(key => [key, url.searchParams.get(key) || '']));
        if (filters.date) episodes = episodes.filter(e => e.dateDetected === filters.date);
        if (filters.status) { const statuses = filters.status.split(','); episodes = episodes.filter(e => statuses.includes(e.productionStatus)); }
        if (filters.theme) episodes = episodes.filter(e => e.themes.includes(filters.theme));
        if (filters.show) episodes = episodes.filter(e => e.show === filters.show);
        if (filters.materiality) episodes = episodes.filter(e => e.materiality === filters.materiality);
        if (filters.entity) { const entity = filters.entity.toLocaleLowerCase(); episodes = episodes.filter(e => e.entities.some(value => value.id.toLocaleLowerCase() === entity || value.name.toLocaleLowerCase() === entity)); }
        if (filters.sourceTier) episodes = episodes.filter(e => e.sourceTier === filters.sourceTier);
        if (filters.lowInformation === 'true') episodes = episodes.filter(e => e.lowInformation);
        if (filters.lowInformation === 'false') episodes = episodes.filter(e => !e.lowInformation);
        if (filters.q) episodes = episodes.filter(e => matchQuery(e, filters.q));
        const total = episodes.length; const limit = parseBoundedInt(url.searchParams.get('limit'), 50, 100); const offset = parseBoundedInt(url.searchParams.get('offset'), 0, 1_000_000);
        return json(res, 200, { total, limit, offset, episodes: episodes.slice(offset, offset + limit).map(e => publicEpisode(e)) });
      }
      if (pathname === '/api/search') {
        const q = url.searchParams.get('q') || ''; const limit = parseBoundedInt(url.searchParams.get('limit'), 20, 50);
        if (!q.trim()) return json(res, 200, { query: '', total: 0, episodes: [] });
        const found = getIndex().episodes.filter(e => matchQuery(e, q, true));
        return json(res, 200, { query: q, total: found.length, episodes: found.slice(0, limit).map(e => publicEpisode(e)) });
      }
      const fileMatch = pathname.match(/^\/api\/episodes\/([^/]+)\/files\/([^/]+)$/);
      if (fileMatch) {
        const episode = getIndex().episodes.find(e => e.id === decodeURIComponent(fileMatch[1]));
        if (!episode) return json(res, 404, { error: 'episode_not_found' });
        const file = fileForKind(episode, decodeURIComponent(fileMatch[2]));
        if (!file) return json(res, 404, { error: 'file_not_found' });
        return serveFile(res, file);
      }
      const detailMatch = pathname.match(/^\/api\/episodes\/([^/]+)$/);
      if (detailMatch) {
        const episode = getIndex().episodes.find(e => e.id === decodeURIComponent(detailMatch[1]));
        if (!episode) return json(res, 404, { error: 'episode_not_found' });
        return json(res, 200, { ...publicEpisode(episode, true), noteMarkdown: readNote(episode), investmentExtraction: readInvestmentExtraction(episode) });
      }
      if (pathname === '/api/file' || pathname === '/api/raw') {
        const result = safeFile(url.searchParams.get('path'));
        if (!result.file) return json(res, result.status, { error: result.error });
        if (pathname === '/api/raw') {
          if (!/\.(md|txt|json)$/i.test(result.file)) return json(res, 415, { error: 'unsupported_raw_file' });
          return send(res, 200, fs.readFileSync(result.file, 'utf8'), { 'content-type': mime(result.file), 'cache-control': 'no-store' });
        }
        return serveFile(res, result.file);
      }
      return json(res, 404, { error: 'api_not_found' });
    } catch (_) { return json(res, 500, { error: 'internal_error' }); }
  }
  return function handler(req, res) {
    let url;
    try { url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`); } catch (_) { return json(res, 400, { error: 'invalid_request' }); }
    let pathname;
    try { pathname = stripBase(decodeURIComponent(url.pathname), basePath); } catch (_) { return json(res, 400, { error: 'invalid_path' }); }
    if (pathname.startsWith('/api/')) return handleApi(req, res, pathname, url);
    const relative = (pathname === '/' ? 'index.html' : pathname).replace(/^\/+/, '');
    const file = path.resolve(PUBLIC_DIR, relative);
    if (!(file === PUBLIC_DIR || file.startsWith(PUBLIC_DIR + path.sep)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not Found', { 'content-type': 'text/plain; charset=utf-8' });
    return send(res, 200, fs.readFileSync(file), { 'content-type': mime(file), 'cache-control': 'no-cache' });
  };
}

function startServer() {
  const host = process.env.HOST || '0.0.0.0'; const port = Number(process.env.PORT || 8832);
  const server = http.createServer(createRequestHandler());
  server.listen(port, host, () => console.error(`Podcast Intelligence Inbox listening on http://${host}:${port}/`));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  return server;
}
if (require.main === module) startServer();

module.exports = { createRequestHandler, startServer, publicEpisode, stripBase };
