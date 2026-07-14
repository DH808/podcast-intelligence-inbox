const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, migrateDatabase, verifyDatabase } = require('../src/library-database');
const { evaluateLibraryReadiness, LIBRARY_GATE_VERSION } = require('../src/library-import');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-library-db-'));
const dbPath = path.join(temp, 'library.sqlite');
const db = openDatabase(dbPath);
migrateDatabase(db);

const required = ['schema_migrations', 'ingest_runs', 'shows', 'show_aliases', 'episodes', 'episode_external_ids', 'artifacts', 'note_versions', 'qc_runs', 'themes', 'episode_themes', 'entities', 'episode_entities', 'claims', 'production_queue', 'episode_search'];
const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')").all().map(row => row.name));
for (const name of required) assert(tables.has(name), `missing schema object ${name}`);
assert.strictEqual(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
assert.deepStrictEqual(verifyDatabase(db).foreignKeyViolations, []);
assert.strictEqual(verifyDatabase(db).integrity, 'ok');

const note = `# 来源边界\n本纪要仅依据官方 RSS 与完整访谈转写，字幕可能包含专名误差，投资含义为后加分析。\n\n## 一句话 thesis\n这场访谈说明企业如何用长期产品纪律建立可持续优势，并给研究者提供能够反复核验的决策框架。\n\n${'这是具有明确访谈依据、机制解释和风险边界的中文纪要正文。'.repeat(90)}`;
const readinessInput = {
  title: 'A substantive episode', show: 'A real show', publishedDate: '2026-07-02',
  originalUrl: 'https://example.com/episodes/1', noteText: note, notePath: __filename,
  expectedSha256: require('crypto').createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
  sourceBoundary: '本纪要仅依据官方 RSS 与完整访谈转写，字幕可能包含专名误差。',
  whyItMatters: '这场访谈说明企业如何用长期产品纪律建立可持续优势，并给研究者提供能够反复核验的决策框架。',
  canonical: true, deterministicQcPassed: true,
};
const ready = evaluateLibraryReadiness(readinessInput);
assert.strictEqual(ready.ready, true);
assert.strictEqual(ready.gateVersion, LIBRARY_GATE_VERSION);
assert(evaluateLibraryReadiness({ ...readinessInput, noteText: '占位' }).reasons.includes('source_note_too_short'));
assert(evaluateLibraryReadiness({ ...readinessInput, originalUrl: 'https://user:secret@example.com' }).reasons.includes('original_source_url_invalid'));
assert.strictEqual(evaluateLibraryReadiness({ ...readinessInput, originalUrl: '', canonicalSourceType: 'official_rss',
  officialRssEnclosureUrl: 'https://cdn.example.com/episode.mp3', officialRssEnclosureType: 'audio/mpeg' }).ready, true);
assert(evaluateLibraryReadiness({ ...readinessInput, originalUrl: '', canonicalSourceType: 'radar_candidate',
  officialRssEnclosureUrl: 'https://cdn.example.com/episode.mp3', officialRssEnclosureType: 'audio/mpeg' }).reasons.includes('original_source_url_invalid'));
assert(evaluateLibraryReadiness({ ...readinessInput, originalUrl: '', canonicalSourceType: 'official_rss',
  officialRssEnclosureUrl: 'https://cdn.example.com/cover.jpg', officialRssEnclosureType: 'image/jpeg' }).reasons.includes('original_source_url_invalid'));

db.close();
fs.rmSync(temp, { recursive: true, force: true });
console.log('library database tests passed');
