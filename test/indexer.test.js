const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildIndex, safeResolvePodcastPath, normalizeTitle, canonicalUrl, extractThemes } = require('../src/indexer');

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-inbox-indexer-'));
  const day = path.join(root, '2026-07-11');
  const candidates = [
    { id: 'yt_ALPHA123456', video_id: 'ALPHA123456', type: 'youtube', title: 'Cerebras and Black Forest Labs with Andrew Feldman', show: 'Latent Space', source_key: 'youtube:Latent Space', published: '2026-07-10T01:00:00Z', url: 'https://youtu.be/ALPHA123456', materiality: 'high', status: 'new_detected' },
    { id: 'url-match', type: 'podcast_rss', title: 'Enterprise AI Field Notes', show: '20VC', url: 'https://example.com/episodes/enterprise?utm_source=rss', materiality: 'selective', status: 'new_detected' },
    { id: 'title-match', type: 'podcast_rss', title: 'General Relativity From First Principles', show: 'Dwarkesh Podcast', url: '', materiality: 'monitor', status: 'new_detected' },
    { id: 'new-only', type: 'podcast_rss', title: 'Only Discovered Today', show: 'Odd Lots', url: 'https://example.com/new', materiality: 'high', status: 'new_detected' },
  ];
  write(path.join(day, 'candidates.json'), candidates);
  write(path.join(root, 'state.json'), { sources: {
    'youtube:Latent Space': { tier: 'Tier A', show_title: 'Latent Space', last_status: 200, last_scan_at: '2026-07-11T01:00:00Z' },
    'Odd Lots': { tier: 'Tier A', show_title: 'Odd Lots', last_status: 500, last_scan_at: '2026-07-11T01:00:00Z' },
  } });

  const byId = path.join(day, 'LatentSpace_OpenSource_AGI');
  write(path.join(byId, 'metadata.json'), { candidate_id: 'yt_ALPHA123456', video_id: 'ALPHA123456', title: candidates[0].title, channel: 'Latent Space', url: 'https://www.youtube.com/watch?v=ALPHA123456', source_boundary: 'Third-party subtitle-derived transcript', duration_approx: '01:03:56' });
  write(path.join(byId, 'notes_cn_source_faithful.md'), '# Open Source Wins 深度纪要\n\n完整正文 searchable evidence.');
  write(path.join(byId, 'notes_cn_source_faithful.docx'), 'docx');
  write(path.join(byId, 'notes_cn_source_faithful.qc.json'), { md_chars: 42, paragraph_count: 8 });
  write(path.join(byId, 'transcript_timestamped.txt'), '00:00 transcript');

  const byUrl = path.join(day, 'Enterprise_AI');
  write(path.join(byUrl, 'metadata.json'), { title: candidates[1].title, source: '20VC', url: 'https://example.com/episodes/enterprise', transcript_status: 'official transcript' });
  write(path.join(byUrl, 'transcript_plain.txt'), 'transcript');

  const byTitle = path.join(day, 'Relativity');
  write(path.join(byTitle, 'metadata.json'), { title: 'General relativity, from first principles!', source: 'Dwarkesh Podcast' });
  write(path.join(byTitle, 'notes_cn_source_faithful.md'), '# Relativity\n\nNote body');

  const orphan = path.join(day, 'Podcast_Crossover');
  write(path.join(orphan, 'notes_cn_source_faithful.md'), '# Podcast Crossover 深度纪要\n\n- **原题**：AIE, AGI and frontier lab strategy\n- **来源**：Latent Space\n- **视频**：https://www.youtube.com/watch?v=ORPHAN12345\n- **Source boundary**：字幕衍生转录。\n\nArtifact only body.');
  write(path.join(orphan, 'notes_cn_source_faithful.docx'), 'docx');
  write(path.join(orphan, 'transcript_plain.txt'), 'transcript');
  return root;
}

function run() {
  assert.strictEqual(normalizeTitle('The AI—Show!'), 'ai');
  assert.strictEqual(canonicalUrl('https://youtu.be/ALPHA123456?t=2'), 'youtube:ALPHA123456');
  assert.deepStrictEqual(extractThemes('unclassified conversation'), [], 'General must never be emitted');

  const root = makeFixture();
  const index = buildIndex(root);
  assert.strictEqual(index.days.length, 1);
  assert.strictEqual(index.days[0].candidateCount, 4, 'candidate-only day must be indexed');
  assert.strictEqual(index.days[0].itemCount, 5, 'four candidates plus one honest artifact-only episode');
  assert.strictEqual(index.episodes.length, 5);

  const alpha = index.episodes.find(e => e.candidateId === 'yt_ALPHA123456');
  assert(alpha, 'candidate must match artifact by explicit/video ID');
  assert.strictEqual(alpha.productionStatus, 'qc_passed');
  assert.strictEqual(alpha.transcriptStatus, 'ready');
  assert.deepStrictEqual(alpha.entities.map(entity => entity.name), ['Cerebras', 'Black Forest Labs', 'Andrew Feldman']);
  assert.strictEqual(alpha.sourceTier, 'core');
  assert.strictEqual(alpha.lowInformation, false);
  assert.match(alpha.routingReason || alpha.reason, /深度纪要完成/);
  assert(alpha.notePath.endsWith('notes_cn_source_faithful.md'));
  assert(alpha.docxPath.endsWith('.docx'));
  assert(alpha.qcPath.endsWith('.qc.json'));
  assert.strictEqual(index.episodes.filter(e => canonicalUrl(e.originalUrl) === 'youtube:ALPHA123456').length, 1, 'canonical YouTube episode must not duplicate');

  assert.strictEqual(index.episodes.find(e => e.candidateId === 'url-match').productionStatus, 'transcript_ready', 'URL match must merge transcript');
  assert.strictEqual(index.episodes.find(e => e.candidateId === 'title-match').productionStatus, 'note_ready', 'normalized title match must merge note');
  assert.strictEqual(index.episodes.find(e => e.candidateId === 'new-only').productionStatus, 'new');
  assert(index.episodes.some(e => e.artifactOnly && e.title.includes('AIE, AGI')), 'unmatched nested note must remain visible');
  assert(index.sources[0].sourceTier === 'core', 'core shows must be pinned first');
  assert(index.sources.some(source => source.title === 'Invest Like the Best' && source.sourceTier === 'core'), 'absent core shows must remain projected');
  assert(!index.themes.some(theme => theme.label === 'General'));

  const full = fs.readFileSync(safeResolvePodcastPath(root, alpha.notePath), 'utf8');
  assert.match(full, /searchable evidence/);
  assert.throws(() => safeResolvePodcastPath(root, path.join(root, '..', 'secret.txt')), /outside/);
  assert.throws(() => safeResolvePodcastPath(root, path.join(root, 'missing.md')), /does not exist/);
  const outside = path.join(os.tmpdir(), `podcast-outside-${Date.now()}.txt`); fs.writeFileSync(outside, 'secret');
  const link = path.join(root, 'escaped-link.txt'); fs.symlinkSync(outside, link);
  assert.throws(() => safeResolvePodcastPath(root, link), /outside/, 'symlinks must not escape the archive');
}

run();
console.log('indexer tests passed');
