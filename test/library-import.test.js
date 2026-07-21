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

const relationshipTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-library-relationships-'));
const relationshipRadar = path.join(relationshipTemp, 'radar'); const relationshipQueries = path.join(relationshipTemp, 'queries');
const relationshipRaw = path.join(relationshipTemp, 'raw'); const relationshipReports = path.join(relationshipTemp, 'reports');
for (const dir of [relationshipRadar, relationshipQueries, relationshipRaw, relationshipReports]) fs.mkdirSync(dir, { recursive: true });
const relationshipDay = path.join(relationshipRadar, '2026-07-14'); fs.mkdirSync(relationshipDay);
const wixOfficialTitle = "20VC: Wix's Founder on What Wall St Gets Wrong About AI and Wix | Will Base44 Win the Vibe Coding Wars";
const wixOfficialUrl = 'https://thetwentyminutevc.example/20vc-wix-founder-base44';
const rssOnlyTitle = 'Direct RSS Kimi K3 expert discussion';
const rssOnlyUrl = 'https://thetwentyminutevc.example/direct-rss-kimi-k3';
const wixYoutubeTitle = 'Wix Founder: Will Base44 Win the Vibe-Coding Wars? | The Truth About the Economics of Vibe-Coding';
const engramTitle = 'The AI Memory Problem: Why Long Context Isn’t Enough — Dan Biderman, Engram Co-founder & CEO';
const twentyVcName = 'The Twenty Minute VC (20VC): Venture Capital | Startup Funding | The Pitch';
const twentyVcRss = path.join(relationshipDay, '20VC.rss.xml');
fs.writeFileSync(twentyVcRss, `<?xml version="1.0"?><rss><channel><title>${twentyVcName}</title><item><title>${wixOfficialTitle}</title>
<link>${wixOfficialUrl}</link><pubDate>Mon, 13 Jul 2026 07:07:00 +0000</pubDate><guid>wix-official-guid</guid>
<enclosure url="https://cdn.example.com/wix.mp3" type="audio/mpeg"/></item>
<item><title>${rssOnlyTitle}</title><link>${rssOnlyUrl}</link><pubDate>Mon, 13 Jul 2026 18:30:00 +0000</pubDate><guid>rss-only-guid</guid>
<enclosure url="https://cdn.example.com/rss-only.mp3" type="audio/mpeg"/></item></channel></rss>`);
const latentRss = path.join(relationshipDay, 'Latent_Space.rss.xml');
fs.writeFileSync(latentRss, '<?xml version="1.0"?><rss><channel><title>Latent Space</title></channel></rss>');
const latentYoutube = path.join(relationshipDay, 'Latent_Space.youtube.xml');
fs.writeFileSync(latentYoutube, `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
<author><name>Latent Space</name></author><entry><yt:videoId>jhpmMTus5a0</yt:videoId><yt:channelId>UCLATENT</yt:channelId>
<title>${engramTitle}</title><published>2026-07-13T18:21:40+00:00</published><link href="https://www.youtube.com/watch?v=jhpmMTus5a0"/>
<author><name>Latent Space</name></author></entry></feed>`);
fs.writeFileSync(path.join(relationshipRadar, 'state.json'), JSON.stringify({ sources: {
  '20VC': { collectionName: twentyVcName, show_title: twentyVcName, feed_url: 'https://example.com/20vc.xml', last_raw_path: twentyVcRss },
  'Latent Space': { collectionName: 'Latent Space', show_title: 'Latent Space', feed_url: 'https://example.com/latent.xml', last_raw_path: latentRss },
}, youtube_sources: {
  '20VC': { channel_id: 'UC20VC', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC20VC' },
  'Latent Space': { channel_id: 'UCLATENT', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLATENT', last_raw_path: latentYoutube },
} }));
const wixRssCandidate = { id: '9ddd413fff822f2bff674b34', type: 'podcast_rss', title: wixOfficialTitle, show: twentyVcName,
  source_key: '20VC', published: '2026-07-13T07:07:00+00:00', url: wixOfficialUrl, materiality: 'high', status: 'new_detected' };
const rssOnlyCandidate = { id: 'rss-direct-kimi-k3', type: 'podcast_rss', title: rssOnlyTitle, show: twentyVcName,
  source_key: '20VC', published: '2026-07-13T18:30:00+00:00', url: rssOnlyUrl, materiality: 'high', status: 'new_detected' };
const wixYoutubeCandidate = { id: 'yt_TdQyVXN0GF8', type: 'youtube', video_id: 'TdQyVXN0GF8', title: wixYoutubeTitle, show: '20VC',
  source_key: 'youtube:20VC', published: '2026-07-13T13:58:39+00:00', url: 'https://www.youtube.com/watch?v=TdQyVXN0GF8', materiality: 'high', status: 'new_detected' };
const engramCandidate = { id: 'yt_jhpmMTus5a0', type: 'youtube', video_id: 'jhpmMTus5a0', title: engramTitle, show: 'Latent Space',
  source_key: 'youtube:Latent Space', published: '2026-07-13T18:21:40+00:00', url: 'https://www.youtube.com/watch?v=jhpmMTus5a0', materiality: 'monitor', status: 'new_detected' };
const crossShowCandidate = { ...wixYoutubeCandidate, id: 'yt_CROSSSHOW1', video_id: 'CROSSSHOW1', title: wixOfficialTitle, show: 'Latent Space',
  source_key: 'youtube:Latent Space', url: 'https://www.youtube.com/watch?v=CROSSSHOW1' };
const invalidCandidate = { ...engramCandidate, id: 'yt_INVALIDMETA1', video_id: 'INVALIDMETA1', title: 'Invalid metadata must stay out',
  url: 'https://www.youtube.com/watch?v=INVALIDMETA1' };
const relationshipCandidates = [wixRssCandidate, rssOnlyCandidate, wixYoutubeCandidate, engramCandidate, crossShowCandidate, invalidCandidate];
fs.writeFileSync(path.join(relationshipDay, 'candidates.json'), JSON.stringify(relationshipCandidates));
function completedCandidateArtifact(name, candidate, whyHeading, metadata = {}) {
  const dir = path.join(relationshipDay, name); fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id: candidate.id, type: candidate.type, video_id: candidate.video_id,
    title: candidate.title, show: candidate.show, published: candidate.published, url: candidate.url,
    source_boundary: 'YouTube caption-derived transcript; not a human-edited official transcript.', ...metadata }));
  fs.writeFileSync(path.join(dir, 'notes_cn_source_faithful.md'), `# ${candidate.title}\n\n- **节目**：${candidate.show}\n- **视频**：${candidate.url}\n\n## Source boundary\n本纪要严格依据完整的 YouTube 字幕衍生转写，字幕并非人工校订官方逐字稿，专名和数字仍需复核。\n\n## ${whyHeading}\n这期完整访谈提供了可核验的产品、市场与技术论证，并保留嘉宾的条件限定、反例和风险边界，适合作为研究阅读材料。\n\n## 完整正文\n${'这是依据完整字幕整理的来源保真中文内容，保留原始论证顺序、数字语境、异议和关键限定。'.repeat(45)}`);
  fs.writeFileSync(path.join(dir, 'notes_cn_source_faithful.qc.json'), JSON.stringify({ passed: true, md_chars: 2600, nonempty_paragraphs: 20 }));
  fs.writeFileSync(path.join(dir, 'notes_cn_source_faithful.docx'), 'fixture docx');
  fs.writeFileSync(path.join(dir, 'transcript_timestamped.txt'), '00:00 complete source transcript');
  return dir;
}
const wixArtifactDir = completedCandidateArtifact('20VC_Wix', wixYoutubeCandidate, '一、研究导读：为什么值得关注');
const rssOnlyArtifactDir = completedCandidateArtifact('20VC_Rss_Only_Kimi', rssOnlyCandidate, '为什么对研究重要');
const engramArtifactDir = completedCandidateArtifact('LatentSpace_Engram', engramCandidate, '一句话结论');
const invalidArtifactDir = completedCandidateArtifact('Invalid_Metadata', invalidCandidate, '为什么对研究重要', { title: 'mismatched metadata title' });
fs.writeFileSync(path.join(relationshipDay, 'processing_decisions.json'), JSON.stringify([
  { ...wixRssCandidate, decision: 'duplicate_of_youtube_full_episode', duplicate_of: wixYoutubeCandidate.id },
  { ...wixYoutubeCandidate, decision: 'processed_full_note', artifact_dir: wixArtifactDir },
  { ...rssOnlyCandidate, decision: 'processed_full_note', artifact_dir: rssOnlyArtifactDir },
  { ...engramCandidate, decision: 'processed_full_note', artifact_dir: engramArtifactDir },
  { ...invalidCandidate, decision: 'processed_full_note', artifact_dir: invalidArtifactDir },
]));
const relationshipDbPath = path.join(relationshipTemp, 'library.sqlite');
const relationshipBuild = rebuildLibrary({ dbPath: relationshipDbPath, radarRoot: relationshipRadar, queriesRoot: relationshipQueries,
  rawReportsRoot: relationshipRaw, reportsDir: relationshipReports, since: '2026-07-01' });
assert.strictEqual(relationshipBuild.counts.canonicalEpisodes, 3, 'Wix and direct RSS notes must merge while only valid candidate-only Engram may be added');
assert.strictEqual(relationshipBuild.counts.readyEpisodes, 3, 'YouTube-linked, direct RSS and candidate-only fixtures must pass library-ready-v2');
const relationshipDb = openDatabase(relationshipDbPath, { readOnly: true });
const relationshipIds = relationshipDb.prepare(`SELECT x.id_type,x.id_value,x.episode_id,e.canonical_source_type,e.reader_ready,e.canonical_title
  FROM episode_external_ids x JOIN episodes e ON e.id=x.episode_id
  WHERE x.id_value IN ('9ddd413fff822f2bff674b34','rss-direct-kimi-k3','yt_TdQyVXN0GF8','TdQyVXN0GF8','yt_jhpmMTus5a0','jhpmMTus5a0')`).all();
const wixEpisodeIds = new Set(relationshipIds.filter(row => ['9ddd413fff822f2bff674b34', 'yt_TdQyVXN0GF8', 'TdQyVXN0GF8'].includes(row.id_value)).map(row => row.episode_id));
assert.strictEqual(wixEpisodeIds.size, 1, 'the explicit Wix duplicate relationship must attach every identity to one canonical RSS episode');
const wixRelationshipRow = relationshipIds.find(row => row.id_value === 'yt_TdQyVXN0GF8');
assert.strictEqual(wixRelationshipRow.canonical_source_type, 'official_rss');
assert.strictEqual(wixRelationshipRow.canonical_title, wixOfficialTitle);
assert.strictEqual(wixRelationshipRow.reader_ready, 1);
const rssOnlyRelationshipRow = relationshipIds.find(row => row.id_value === 'rss-direct-kimi-k3');
assert.strictEqual(rssOnlyRelationshipRow.canonical_source_type, 'official_rss');
assert.strictEqual(rssOnlyRelationshipRow.canonical_title, rssOnlyTitle);
assert.strictEqual(rssOnlyRelationshipRow.reader_ready, 1, 'a candidate-exact direct RSS artifact must attach to its official episode');
const engramRelationshipRow = relationshipIds.find(row => row.id_value === 'yt_jhpmMTus5a0');
assert.strictEqual(engramRelationshipRow.canonical_source_type, 'radar_archive');
assert.strictEqual(engramRelationshipRow.reader_ready, 1);
assert.strictEqual(relationshipDb.prepare(`SELECT COUNT(*) AS count FROM episode_external_ids WHERE id_value IN ('yt_CROSSSHOW1','yt_INVALIDMETA1')`).get().count, 0,
  'same-title cross-show candidates and metadata identity mismatches must not enter the catalog');
assert.strictEqual(relationshipDb.prepare('SELECT COUNT(*) AS count FROM episodes').get().count, 3);
relationshipDb.close();
fs.rmSync(relationshipTemp, { recursive: true, force: true });

const directYoutubeTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-library-direct-youtube-'));
const directYoutubeRadar = path.join(directYoutubeTemp, 'radar'); const directYoutubeQueries = path.join(directYoutubeTemp, 'queries');
const directYoutubeRaw = path.join(directYoutubeTemp, 'raw'); const directYoutubeReports = path.join(directYoutubeTemp, 'reports');
for (const dir of [directYoutubeRadar, directYoutubeQueries, directYoutubeRaw, directYoutubeReports]) fs.mkdirSync(dir, { recursive: true });
const directYoutubeDay = path.join(directYoutubeRadar, '2026-07-19'); fs.mkdirSync(directYoutubeDay);
const directVideoId = '9IMwRIei-Xc'; const directTitle = 'Can the AI Industry Regulate Itself?';
const directUrl = `https://www.youtube.com/watch?v=${directVideoId}`;
const directFeed = path.join(directYoutubeDay, 'All-In_Podcast.youtube.xml');
fs.writeFileSync(directFeed, `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
<author><name>All-In Podcast</name></author><entry><yt:videoId>${directVideoId}</yt:videoId><yt:channelId>UCALLIN</yt:channelId>
<title>${directTitle}</title><published>2026-07-18T00:54:40+00:00</published><link href="${directUrl}"/>
<author><name>All-In Podcast</name></author></entry></feed>`);
fs.writeFileSync(path.join(directYoutubeRadar, 'state.json'), JSON.stringify({ sources: {}, youtube_sources: {
  'All-In Podcast': { channel_id: 'UCALLIN', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCALLIN', last_raw_path: directFeed },
} }));
const directCandidate = { id: `yt_${directVideoId}`, type: 'youtube', video_id: directVideoId, title: directTitle,
  show: 'All-In Podcast', source_key: 'youtube:All-In Podcast', published: '2026-07-18T00:54:40+00:00', url: directUrl,
  materiality: 'high', status: 'new_detected' };
fs.writeFileSync(path.join(directYoutubeDay, 'candidates.json'), JSON.stringify([directCandidate]));
const directArtifact = path.join(directYoutubeDay, 'AllIn_Direct'); fs.mkdirSync(directArtifact);
fs.writeFileSync(path.join(directArtifact, 'metadata.json'), JSON.stringify({ id: directCandidate.id, candidate_id: directCandidate.id,
  video_id: directVideoId, title: directTitle, show: directCandidate.show, published: directCandidate.published, url: directUrl,
  source_boundary: 'YouTube caption-derived transcript; not a human-edited official transcript.' }));
fs.writeFileSync(path.join(directArtifact, 'notes_cn_source_faithful.md'), `# ${directTitle}\n\n- **节目**：All-In Podcast\n- **视频**：${directUrl}\n\n## Source boundary\n本纪要依据完整YouTube字幕。\n\n## 为什么对研究重要\n这期节目提供了可核验的模型、监管、企业成本和市场讨论，并完整保留不同主持人的分歧、条件限定与后续验证问题，足以支持研究者继续核对事实和投资含义。\n\n## 完整正文\n${'来源保真中文内容，保留论证顺序、数字、异议和限定。'.repeat(100)}`);
fs.writeFileSync(path.join(directArtifact, 'notes_cn_source_faithful.qc.json'), JSON.stringify({ passed: true, ready: true }));
fs.writeFileSync(path.join(directArtifact, 'transcript_timestamped.txt'), '00:00 complete source transcript');
fs.writeFileSync(path.join(directYoutubeDay, 'processing_decisions.json'), JSON.stringify([
  { ...directCandidate, decision: 'processed_full_note', artifact_dir: directArtifact },
]));
const directYoutubeDbPath = path.join(directYoutubeTemp, 'library.sqlite');
const directYoutubeBuild = rebuildLibrary({ dbPath: directYoutubeDbPath, radarRoot: directYoutubeRadar, queriesRoot: directYoutubeQueries,
  rawReportsRoot: directYoutubeRaw, reportsDir: directYoutubeReports, since: '2026-07-01' });
assert.strictEqual(directYoutubeBuild.counts.canonicalEpisodes, 1);
assert.strictEqual(directYoutubeBuild.counts.readyEpisodes, 1, 'a candidate-exact YouTube artifact must attach to its official feed episode');
fs.rmSync(directYoutubeTemp, { recursive: true, force: true });
console.log('library import tests passed');
