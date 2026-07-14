const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseRss, rebuildLibrary, exportSanitizedSnapshot } = require('../src/library-import');
const { openDatabase, verifyDatabase } = require('../src/library-database');
const { LibraryRepository } = require('../src/library-repository');
const { createSnapshotRequestHandler } = require('../server');

function request(handler, route) {
  const response = { writeHead(status) { this.status = status; }, end(body) { this.body = Buffer.isBuffer(body) ? body : Buffer.from(body || ''); } };
  handler({ url: route, method: 'GET', headers: { host: 'localhost' } }, response);
  return { status: response.status, text: response.body.toString('utf8'), json: () => JSON.parse(response.body.toString('utf8')) };
}

const rss = `<?xml version="1.0"?><rss><channel><title>Invest Like the Best with Patrick O'Shaughnessy</title>
<item><title>Jeremy Giffon - The Billion Dollar PDF - [Invest Like the Best, EP.481]</title><link>https://example.com/jeremy/?utm_source=x</link><description>Official description</description><pubDate>Tue, 07 Jul 2026 08:00:00 -0000</pubDate><itunes:episode>481</itunes:episode><itunes:duration>01:02:03</itunes:duration><guid>guid-481</guid><enclosure url="https://cdn.example.com/481.mp3?utm_source=x" type="audio/mpeg"/></item>
<item><title>Earlier episode</title><link>https://example.com/old</link><pubDate>Tue, 30 Jun 2026 08:00:00 -0000</pubDate><guid>old-guid</guid></item>
</channel></rss>`;
const parsed = parseRss(rss);
assert.strictEqual(parsed.title, "Invest Like the Best with Patrick O'Shaughnessy");
assert.strictEqual(parsed.items[0].guid, 'guid-481');
assert.strictEqual(parsed.items[0].episodeNumber, '481');
assert.strictEqual(parsed.items[0].durationSeconds, 3723);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-library-import-'));
const radar = path.join(temp, 'radar'); const queries = path.join(temp, 'queries'); const raw = path.join(temp, 'raw'); const reports = path.join(temp, 'reports');
for (const dir of [radar, queries, raw, reports]) fs.mkdirSync(dir, { recursive: true });
const day = path.join(radar, '2026-07-14'); fs.mkdirSync(day);
const rssPath = path.join(day, 'Invest_Like_the_Best.rss.xml'); fs.writeFileSync(rssPath, rss);
fs.writeFileSync(path.join(radar, 'state.json'), JSON.stringify({ sources: { 'Invest Like the Best': { tier: 'Tier A', show_title: "Invest Like the Best with Patrick O'Shaughnessy", collectionName: 'Invest Like the Best', feed_url: 'https://example.com/feed', trackViewUrl: 'https://example.com/show', collectionId: 1154105909, last_raw_path: rssPath } } }));
fs.writeFileSync(path.join(day, 'candidates.json'), JSON.stringify([{ id: 'candidate-481', source_key: 'Invest Like the Best', show: 'Invest Like the Best', title: 'Jeremy Giffon: The Billion Dollar PDF', published: '2026-07-07T08:00:00Z', url: 'https://example.com/jeremy/?ref=radar' }]));
const notePath = path.join(queries, 'invest-like-the-best-jeremy-giffon-billion-dollar-pdf-sobridge-notes-20260708.md');
fs.writeFileSync(notePath, `# Invest Like the Best EP.481｜Jeremy Giffon\n\n## Source boundary / 来源边界\n本纪要严格依据官方 RSS 和完整转写；转写并非官方逐字稿，专名与数字仍需复核。\n\n## 一句话 thesis\n这场访谈解释内容分发、私人市场和人才判断如何互相作用，并为投资研究提供可以继续核验的明确问题清单。\n\n${'这是一段来源保真、含机制与风险限定的中文访谈纪要正文。'.repeat(100)}`);
fs.writeFileSync(notePath.replace(/\.md$/, '.docx'), 'fixture docx');
const timelineDir = path.join(queries, 'inventory'); fs.mkdirSync(timelineDir);
fs.writeFileSync(path.join(timelineDir, 'invest-like-the-best-latest-485-episode-timeline-20260518.json'), JSON.stringify({ episodes: [] }));

const dbPath = path.join(temp, 'library.sqlite');
const options = { dbPath, radarRoot: radar, queriesRoot: queries, rawReportsRoot: raw, reportsDir: reports, since: '2026-07-01' };
const first = rebuildLibrary(options);
assert.strictEqual(first.counts.monitoredShows, 1);
assert.strictEqual(first.counts.officialSinceCutoff, 1);
assert.strictEqual(first.counts.canonicalEpisodes, 1, 'RSS, candidate and historical note must merge');
assert.strictEqual(first.counts.readyEpisodes, 1);
assert.strictEqual(first.inventory.iltbCanonicalSobridgeMarkdown, 1);

let db = openDatabase(dbPath, { readOnly: true });
let repo = new LibraryRepository(db);
const library = repo.library({ limit: 10, offset: 0 });
assert.strictEqual(library.total, 1);
assert.strictEqual(library.episodes[0].detailUrl.startsWith('/api/episodes/'), true);
const episodeId = library.episodes[0].id;
assert.strictEqual(repo.episode(episodeId).noteMarkdown.includes('来源保真'), true);
assert.strictEqual(repo.search('内容分发').total, 1, 'FTS must index canonical note text');
assert.strictEqual(repo.catalog({ limit: 10, offset: 0 }).episodes[0].readerReady, true);
assert.strictEqual(verifyDatabase(db).integrity, 'ok');
db.close();

const second = rebuildLibrary(options);
assert.strictEqual(second.counts.insertedEpisodes, 0);
db = openDatabase(dbPath, { readOnly: true }); repo = new LibraryRepository(db);
assert.strictEqual(repo.library({ limit: 10, offset: 0 }).episodes[0].id, episodeId, 'canonical IDs must be stable');
db.close();

const exportPath = path.join(temp, 'sanitized.json');
const exported = exportSanitizedSnapshot({ dbPath, outputPath: exportPath });
assert.strictEqual(exported.episodes.length, 1);
const serialized = fs.readFileSync(exportPath, 'utf8');
assert(!serialized.includes(temp));
assert(!serialized.includes('origin_path'));
assert(!serialized.includes('production_queue'));
const snapshotHandler = createSnapshotRequestHandler({ snapshotPath: exportPath });
assert.strictEqual(request(snapshotHandler, '/api/state').json().privateMode, false);
assert.strictEqual(request(snapshotHandler, '/api/library').json().total, 1);
assert.strictEqual(request(snapshotHandler, `/api/episodes/${episodeId}`).json().noteMarkdown.includes('来源保真'), true);
assert.strictEqual(request(snapshotHandler, '/api/catalog').status, 404);
assert.strictEqual(request(snapshotHandler, '/api/queue').status, 404);
assert(!request(snapshotHandler, '/api/state').text.includes(temp));

for (const report of ['podcast_asset_inventory.json', 'podcast_ingest_report.json', 'podcast_merge_ledger.json', 'podcast_coverage_since_2026-07-01.json']) assert(fs.existsSync(path.join(reports, report)), `missing report ${report}`);
fs.rmSync(temp, { recursive: true, force: true });
console.log('library import tests passed');
