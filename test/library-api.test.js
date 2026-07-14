const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { rebuildLibrary } = require('../src/library-import');
const { createDatabaseRequestHandler } = require('../server');

function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); }
function request(handler, route) {
  const headers = {};
  const response = { writeHead(status, values) { this.status = status; Object.assign(headers, values); }, end(body) { this.body = Buffer.isBuffer(body) ? body : Buffer.from(body || ''); } };
  handler({ url: route, method: 'GET', headers: { host: 'localhost' } }, response);
  const text = response.body.toString('utf8');
  return { status: response.status, text, json: () => JSON.parse(text), headers };
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-library-api-'));
const radar = path.join(temp, 'radar'); const queries = path.join(temp, 'queries'); const raw = path.join(temp, 'raw'); const reports = path.join(temp, 'reports');
const day = path.join(radar, '2026-07-14'); fs.mkdirSync(day, { recursive: true }); fs.mkdirSync(queries); fs.mkdirSync(raw);
const rssPath = path.join(day, 'show.xml');
write(rssPath, `<?xml version="1.0"?><rss><channel><title>Test Show</title>
<item><title>Ready Guest - Durable Systems - [Test Show, EP.2]</title><link>https://example.com/ready</link><pubDate>Tue, 07 Jul 2026 08:00:00 Z</pubDate><guid>ready-guid</guid><itunes:episode>2</itunes:episode></item>
<item><title>Blocked Guest - Missing Note - [Test Show, EP.1]</title><link>https://example.com/blocked</link><pubDate>Mon, 06 Jul 2026 08:00:00 Z</pubDate><guid>blocked-guid</guid><itunes:episode>1</itunes:episode></item>
</channel></rss>`);
write(path.join(radar, 'state.json'), { sources: { test: { show_title: 'Test Show', collectionName: 'Test Show', feed_url: 'https://example.com/feed', last_raw_path: rssPath } } });
const notePath = path.join(queries, 'invest-like-the-best-unused.md');
// The generic review adapter must not force this unrelated control-like file into Test Show.
write(notePath, '# Podcast catalog\n\nThis report mentions transcript and source boundary but is only a catalog.');
const readyDir = path.join(day, 'ready');
write(path.join(readyDir, 'metadata.json'), { title: 'Ready Guest - Durable Systems - [Test Show, EP.2]', show: 'Test Show', url: 'https://example.com/ready',
  published_at: '2026-07-07T08:00:00Z', source_boundary: 'Official RSS plus complete transcript; names may contain transcription errors.',
  why_it_matters: '这场访谈解释长期产品纪律如何建立可持续优势，并给研究者提供能够反复核验的明确决策框架与风险边界。' });
write(path.join(readyDir, 'notes_cn_source_faithful.md'), `# 来源边界\nOfficial RSS plus complete transcript; names may contain transcription errors.\n\n## 为什么值得研究\n这场访谈解释长期产品纪律如何建立可持续优势，并给研究者提供能够反复核验的明确决策框架与风险边界。\n\n${'这是依据完整访谈整理的来源保真中文纪要，保留机制、反例、数字语境和不确定性。'.repeat(90)}`);
write(path.join(readyDir, 'notes_cn_source_faithful.qc.json'), { passed: true, md_chars: 4000 });

const dbPath = path.join(temp, 'library.sqlite');
rebuildLibrary({ dbPath, radarRoot: radar, queriesRoot: queries, rawReportsRoot: raw, reportsDir: reports, since: '2026-07-01' });

const privateHandler = createDatabaseRequestHandler({ dbPath, publicMode: false, exposeErrors: true });
const library = request(privateHandler, '/api/library').json();
assert.strictEqual(library.total, 1);
const readyId = library.episodes[0].id;
assert(library.episodes[0].detailUrl);
const catalogResponse = request(privateHandler, '/api/catalog'); const catalog = catalogResponse.json();
assert.strictEqual(catalog.total, 2);
const blocked = catalog.episodes.find(episode => !episode.readerReady);
assert(blocked && blocked.detailUrl === null);
assert.strictEqual(request(privateHandler, `/api/episodes/${blocked.id}`).status, 404);
assert.strictEqual(request(privateHandler, `/api/episodes/${readyId}`).status, 200);
const queue = request(privateHandler, '/api/queue').json();
assert.strictEqual(queue.total, 1); assert.strictEqual(queue.episodes[0].detailUrl, null);
assert.strictEqual(request(privateHandler, '/api/search?q=Missing%20Note').json().total, 0);
assert.strictEqual(request(privateHandler, '/api/search?q=Missing%20Note&internal=1').json().episodes[0].detailUrl, null);
for (const route of ['/api/library', '/api/catalog', '/api/coverage', '/api/queue', `/api/episodes/${readyId}`, '/api/audit']) {
  const response = request(privateHandler, route); assert(!response.text.includes(temp), `${route} leaked a local path`);
}

const publicHandler = createDatabaseRequestHandler({ dbPath, publicMode: true, exposeErrors: true });
assert.strictEqual(request(publicHandler, '/api/catalog').status, 404);
assert.strictEqual(request(publicHandler, '/api/queue').status, 404);
assert.strictEqual(request(publicHandler, '/api/search?q=Missing%20Note&internal=1').json().total, 0);
const publicState = request(publicHandler, '/api/state');
assert(!publicState.text.includes('Blocked Guest')); assert(!publicState.text.includes(temp));

fs.rmSync(temp, { recursive: true, force: true });
console.log('library API tests passed');
