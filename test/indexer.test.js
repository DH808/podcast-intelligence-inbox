const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildIndex, safeResolvePodcastPath, normalizeTitle, canonicalUrl, extractThemes, evaluatePublicationReadiness, PUBLICATION_GATE_VERSION } = require('../src/indexer');

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}

function completeNote(title = '完整纪要') {
  return `# ${title}\n\n- **来源**：Latent Space\n- **视频**：https://youtu.be/ALPHA123456\n- **Source boundary**：第三方字幕衍生转录，可能存在识别误差。\n\n## 一页定位：为什么对研究重要\n\n这期内容系统解释了模型、基础设施与企业采用之间的约束关系，给出了可核验的原始论证、反方观点和具体案例，因此适合作为研究阅读材料，而不是只提供发现摘要。\n\n## 完整正文\n\n${'这是依据逐字稿整理的来源保真中文内容，保留论证顺序、关键限定条件、数字语境与说话者之间的分歧。'.repeat(30)}`;
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
  write(path.join(byId, 'notes_cn_source_faithful.md'), completeNote('Open Source Wins 深度纪要') + '\n\nsearchable evidence.');
  write(path.join(byId, 'notes_cn_source_faithful.docx'), 'docx');
  write(path.join(byId, 'notes_cn_source_faithful.qc.json'), { md_chars: 1800, paragraph_count: 38, passed: true });
  write(path.join(byId, 'transcript_timestamped.txt'), '00:00 transcript');

  const byUrl = path.join(day, 'Enterprise_AI');
  write(path.join(byUrl, 'metadata.json'), { title: candidates[1].title, source: '20VC', url: 'https://example.com/episodes/enterprise', transcript_status: 'official transcript' });
  write(path.join(byUrl, 'transcript_plain.txt'), 'transcript');

  const byTitle = path.join(day, 'Relativity');
  write(path.join(byTitle, 'metadata.json'), { title: 'General relativity, from first principles!', source: 'Dwarkesh Podcast' });
  write(path.join(byTitle, 'notes_cn_source_faithful.md'), '# Relativity\n\nNote body');

  const orphan = path.join(day, 'Podcast_Crossover');
  write(path.join(orphan, 'notes_cn_source_faithful.md'), '# Podcast Crossover 深度纪要\n\n- **原题**：AIE, AGI and frontier lab strategy\n- **来源**：Latent Space\n- **视频**：https://www.youtube.com/watch?v=ORPHAN12345\n- **发布日期**：2026-07-10\n- **Source boundary**：字幕衍生转录，可能存在识别误差。\n\n## 核心定位\n\n这是对访谈论证和研究价值的完整说明，包含具体观点、证据边界与重要限定，而不是发现摘要。\n\n' + '来源保真中文正文，逐段记录嘉宾观点、论据、异议与限定条件。'.repeat(40));
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
  assert.strictEqual(index.productionDays.length, 1);
  assert.strictEqual(index.productionDays[0].candidateCount, 4, 'candidate-only day must remain internally indexed');
  assert.strictEqual(index.productionDays[0].itemCount, 5, 'four candidates plus one honest artifact-only episode remain internal');
  assert.strictEqual(index.days.length, 1);
  assert.strictEqual(index.days[0].itemCount, 1, 'reader day dataset counts only ready content');
  assert.strictEqual(index.episodes.length, 5);
  assert.strictEqual(index.readyEpisodes.length, 1, 'only the fully complete QC-passed episode is reader-visible');
  assert.deepStrictEqual(index.audit, {
    gateVersion: PUBLICATION_GATE_VERSION,
    totalIndexed: 5,
    ready: 1,
    blocked: 4,
    reasonCounts: index.audit.reasonCounts,
  });

  const alpha = index.episodes.find(e => e.candidateId === 'yt_ALPHA123456');
  assert(alpha, 'candidate must match artifact by explicit/video ID');
  assert.strictEqual(alpha.productionStatus, 'qc_passed');
  assert.strictEqual(alpha.presentationReady, true);
  assert.strictEqual(alpha.publicReady, true);
  assert.deepStrictEqual(alpha.publicationQc, { ready: true, reasons: [], gateVersion: PUBLICATION_GATE_VERSION });
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
  const sparseCoreHigh = index.episodes.find(e => e.candidateId === 'new-only');
  assert.strictEqual(sparseCoreHigh.materiality, 'high');
  assert.strictEqual(sparseCoreHigh.presentationReady, false, 'high materiality cannot override completeness');
  assert(sparseCoreHigh.publicationQc.reasons.includes('production_status_not_qc_passed'));
  assert(sparseCoreHigh.publicationQc.reasons.includes('source_note_missing'));
  assert(index.episodes.some(e => e.artifactOnly && e.title.includes('AIE, AGI')), 'unmatched nested note must remain visible');
  assert(index.sources[0].sourceTier === 'core', 'core shows must be pinned first');
  assert(index.sources.some(source => source.title === 'Invest Like the Best' && source.sourceTier === 'core'), 'absent core shows must remain projected');
  assert(!index.themes.some(theme => theme.label === 'General'));
  assert(index.days.every(day => day.itemIds.every(id => index.readyEpisodes.some(episode => episode.id === id))), 'reader day datasets contain ready IDs only');
  assert.strictEqual(index.stats.episodeCount, 1, 'reader stats count only ready episodes');

  const explicitFailure = evaluatePublicationReadiness({
    productionStatus: 'qc_passed', title: 'Usable title', show: 'Usable show', publishedAt: '2026-07-10',
    originalUrl: 'https://example.com/episode', whyItMatters: '这是一段足够具体且非占位的研究价值说明，明确说明该访谈为什么值得阅读以及读者可以从中获得什么。',
    transcriptBoundary: '官方网页自动生成逐字稿，可能存在识别错误。', qcSummary: { passed: false, paragraph_count: 40 }, qcPath: '/archive/qc.json',
  }, completeNote());
  assert.strictEqual(explicitFailure.ready, false);
  assert(explicitFailure.reasons.includes('qc_artifact_failed'), 'an explicit QC failure cannot pass on file existence');
  const englishOnly = evaluatePublicationReadiness({
    productionStatus: 'qc_passed', title: 'Usable title', show: 'Usable show', publishedAt: '2026-07-10', notePath: '/archive/note.md',
    originalUrl: 'https://example.com/episode', whyItMatters: 'A concrete, non-placeholder explanation of why this complete interview matters to a research reader today.',
    transcriptBoundary: 'Official transcript with a clearly recorded source boundary.', qcSummary: { passed: true }, qcPath: '/archive/qc.json',
  }, '# Source faithful note\n\n' + 'Long English transcript summary with concrete claims and source-order analysis. '.repeat(30));
  assert(englishOnly.reasons.includes('source_note_not_substantive_chinese'));

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
