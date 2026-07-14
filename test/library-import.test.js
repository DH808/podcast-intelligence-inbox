const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseRss, rebuildLibrary, exportSanitizedSnapshot, evaluateLibraryReadiness, guestEntity } = require('../src/library-import');
const { openDatabase, verifyDatabase } = require('../src/library-database');
const { LibraryRepository } = require('../src/library-repository');
const { createSnapshotRequestHandler } = require('../server');

function request(handler, route) {
  const response = { writeHead(status) { this.status = status; }, end(body) { this.body = Buffer.isBuffer(body) ? body : Buffer.from(body || ''); } };
  handler({ url: route, method: 'GET', headers: { host: 'localhost' } }, response);
  return { status: response.status, text: response.body.toString('utf8'), json: () => JSON.parse(response.body.toString('utf8')) };
}

const rss = `<?xml version="1.0"?><rss><channel><title>Invest Like the Best with Patrick O'Shaughnessy</title>
<item><title>Jeremy Giffon - The Billion Dollar PDF - [Invest Like the Best, EP.481]</title><link></link><description>Official description</description><pubDate>Tue, 07 Jul 2026 08:00:00 -0000</pubDate><itunes:episode>481</itunes:episode><itunes:duration>01:02:03</itunes:duration><guid>guid-481</guid><enclosure url="https://cdn.example.com/481.mp3?utm_source=x" type="audio/mpeg"/></item>
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
assert.strictEqual(repo.episode(episodeId).originalUrl, 'https://cdn.example.com/481.mp3');
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

const identityTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-library-identity-'));
const identityRadar = path.join(identityTemp, 'radar'); const identityQueries = path.join(identityTemp, 'queries');
const identityRaw = path.join(identityTemp, 'raw'); const identityReports = path.join(identityTemp, 'reports');
for (const dir of [identityRadar, identityQueries, identityRaw, identityReports]) fs.mkdirSync(dir, { recursive: true });
const identityDay = path.join(identityRadar, '2026-07-12'); fs.mkdirSync(identityDay);
const allInFeed = path.join(identityDay, 'All-In_Podcast.youtube.xml');
fs.writeFileSync(allInFeed, `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
<author><name>All-In Podcast</name></author>
<entry><yt:videoId>PHL1j2ti420</yt:videoId><yt:channelId>UCESLZhusAkFfsNsApnjF_Cg</yt:channelId><author><name>All-In Podcast</name></author></entry>
<entry><yt:videoId>Y7p4rUCdqi0</yt:videoId><yt:channelId>UCESLZhusAkFfsNsApnjF_Cg</yt:channelId><author><name>All-In Podcast</name></author></entry>
</feed>`);
fs.writeFileSync(path.join(identityRadar, 'state.json'), JSON.stringify({ sources: {}, youtube_sources: {
  'Latent Space': { channel_id: 'UCxBcwypKK-W3GHd_RZ9FZrQ', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCxBcwypKK-W3GHd_RZ9FZrQ' },
  'All-In Podcast': { channel_id: 'UCESLZhusAkFfsNsApnjF_Cg', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCESLZhusAkFfsNsApnjF_Cg', last_raw_path: allInFeed },
} }));
const knownEpisodes = [
  ['PHL1j2ti420', "OpenAI vs Anthropic IPOs, Anthropic $3T, Zuck's Price War", '2026-07-11T02:39:34Z'],
  ['Y7p4rUCdqi0', 'Open Source Wins, AGI Is Here, and Scorsese’s AI Toolkit', '2026-07-10T01:15:25Z'],
];
fs.writeFileSync(path.join(identityDay, 'candidates.json'), JSON.stringify(knownEpisodes.map(([videoId, title, publishedAt]) => ({
  id: `yt_${videoId}`, type: 'youtube', video_id: videoId, title, show: 'Latent Space', source_key: 'youtube:Latent Space',
  published: publishedAt, url: `https://www.youtube.com/watch?v=${videoId}`, materiality: 'high', status: 'new_detected',
}))));
function allInNote(title, videoId) {
  return `# ${title}\n\n- **来源**：All-In Podcast\n- **视频**：https://www.youtube.com/watch?v=${videoId}\n- **Source boundary**：本纪要依据 YouTube 字幕衍生转录，字幕可能存在专名误差。\n\n## 为什么对研究重要\n\n这期节目提供了可核验的公司、模型与市场论证，并保留了主持人的分歧和条件限定，适合作为研究阅读材料；读者还可以沿着来源继续核对数字、时间和不同主持人的判断边界。\n\n## 完整正文\n\n${'这是依据字幕整理的来源保真中文内容，保留原始论证顺序、数字语境、异议与关键限定。'.repeat(40)}`;
}
for (const [videoId, title, publishedAt] of knownEpisodes) {
  const dir = path.join(identityDay, `stale_Latent_${videoId}`); fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ video_id: videoId, title, channel: 'Latent Space',
    url: `https://www.youtube.com/watch?v=${videoId}`, published: publishedAt, source_boundary: 'YouTube subtitle-derived transcript' }));
  fs.writeFileSync(path.join(dir, 'notes_cn_source_faithful.md'), allInNote(title, videoId));
  fs.writeFileSync(path.join(dir, 'notes_cn_source_faithful.qc.json'), JSON.stringify({ passed: true, md_chars: 2400, paragraph_count: 12 }));
  fs.writeFileSync(path.join(dir, 'transcript_timestamped.txt'), '00:00 source transcript');
}
const identityDbPath = path.join(identityTemp, 'library.sqlite');
const identityBuild = rebuildLibrary({ dbPath: identityDbPath, radarRoot: identityRadar, queriesRoot: identityQueries,
  rawReportsRoot: identityRaw, reportsDir: identityReports, since: '2026-07-01' });
assert.strictEqual(identityBuild.counts.canonicalEpisodes, 2);
assert.strictEqual(identityBuild.counts.readyEpisodes, 2, 'both corrected All-In identities must remain reader-ready');
const identityDb = openDatabase(identityDbPath, { readOnly: true });
const identityRows = identityDb.prepare(`SELECT x.id_value AS video_id,s.canonical_name,e.reader_ready
  FROM episode_external_ids x JOIN episodes e ON e.id=x.episode_id JOIN shows s ON s.id=e.show_id
  WHERE x.id_type='youtube_id' AND x.id_value IN ('PHL1j2ti420','Y7p4rUCdqi0') ORDER BY x.id_value`).all();
assert.deepStrictEqual(identityRows.map(row => [row.video_id, row.canonical_name, row.reader_ready]), [
  ['PHL1j2ti420', 'All-In Podcast', 1], ['Y7p4rUCdqi0', 'All-In Podcast', 1],
]);
identityDb.close();
const mismatchNotePath = path.join(identityDay, 'stale_Latent_Y7p4rUCdqi0', 'notes_cn_source_faithful.md');
const mismatchNote = fs.readFileSync(mismatchNotePath, 'utf8');
const mismatch = evaluateLibraryReadiness({ title: knownEpisodes[1][1], show: 'Latent Space', publishedDate: '2026-07-10',
  originalUrl: 'https://www.youtube.com/watch?v=Y7p4rUCdqi0', identityUrls: ['https://www.youtube.com/watch?v=Y7p4rUCdqi0'],
  sourceUrlShow: 'All-In Podcast', noteText: mismatchNote, notePath: mismatchNotePath,
  expectedSha256: require('crypto').createHash('sha256').update(fs.readFileSync(mismatchNotePath)).digest('hex'),
  sourceBoundary: 'YouTube subtitle-derived transcript', whyItMatters: '这期节目提供了可核验的公司、模型与市场论证，并保留了主持人的分歧和条件限定。',
  canonical: true, deterministicQcPassed: true });
assert(mismatch.reasons.includes('note_show_identity_mismatch'));
assert(mismatch.reasons.includes('source_url_show_identity_mismatch'));
const wrongVideo = evaluateLibraryReadiness({ title: knownEpisodes[1][1], show: 'All-In Podcast', publishedDate: '2026-07-10',
  originalUrl: 'https://www.youtube.com/watch?v=Y7p4rUCdqi0', identityUrls: ['https://www.youtube.com/watch?v=Y7p4rUCdqi0'],
  noteText: mismatchNote, notePath: mismatchNotePath, noteShow: 'All-In Podcast', noteSourceUrl: 'https://www.youtube.com/watch?v=PHL1j2ti420',
  expectedSha256: require('crypto').createHash('sha256').update(fs.readFileSync(mismatchNotePath)).digest('hex'),
  sourceBoundary: 'YouTube subtitle-derived transcript', whyItMatters: '这期节目提供了可核验的公司、模型与市场论证，并保留了主持人的分歧和条件限定。',
  canonical: true, deterministicQcPassed: true, sourceUrlShow: 'All-In Podcast' });
assert(wrongVideo.reasons.includes('note_source_url_identity_mismatch'), 'a note for one known YouTube ID must not attach to the other');
assert.strictEqual(guestEntity('\u2060Why OpenAI and Anthropic Won\'t Win the App Layer | Glean Founder'), '', 'invisible Unicode must not turn a malformed title fragment into a person');
assert.strictEqual(guestEntity('Outsmarting Uber: Why Bolt Wins in Europe'), '', 'topical title fragments must not become people');
assert.strictEqual(guestEntity('Jeremy Giffon - The Billion Dollar PDF - [Invest Like the Best, EP.481]'), 'Jeremy Giffon');
fs.rmSync(identityTemp, { recursive: true, force: true });
console.log('library import tests passed');
