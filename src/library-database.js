'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const APP_DIR = path.resolve(__dirname, '..');
const DEFAULT_DB_PATH = path.join(APP_DIR, 'data', 'private', 'podcast_intelligence.sqlite');
const MIGRATIONS_DIR = path.join(APP_DIR, 'migrations');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function openDatabase(dbPath = DEFAULT_DB_PATH, options = {}) {
  const resolved = path.resolve(dbPath);
  if (!options.readOnly) fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new DatabaseSync(resolved, {
    readOnly: Boolean(options.readOnly),
    enableForeignKeyConstraints: true,
    allowExtension: false,
    timeout: 5000,
  });
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  if (!options.readOnly) {
    const journalMode = String(options.journalMode || 'WAL').toUpperCase();
    if (!['WAL', 'DELETE'].includes(journalMode)) throw new Error(`unsupported journal mode: ${journalMode}`);
    db.exec(`PRAGMA journal_mode = ${journalMode}; PRAGMA synchronous = FULL`);
  }
  return db;
}

function migrationFiles(migrationsDir = MIGRATIONS_DIR) {
  return fs.readdirSync(migrationsDir).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
}

function migrateDatabase(db, migrationsDir = MIGRATIONS_DIR) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL,
    checksum TEXT NOT NULL
  ) STRICT`);
  const applied = new Map(db.prepare('SELECT version, checksum FROM schema_migrations').all().map(row => [row.version, row.checksum]));
  const results = [];
  for (const file of migrationFiles(migrationsDir)) {
    const version = file.split('_')[0];
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const checksum = sha256(sql);
    if (applied.has(version)) {
      if (applied.get(version) !== checksum) throw new Error(`migration checksum mismatch: ${file}`);
      results.push({ version, file, applied: false, checksum });
      continue;
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations(version, applied_at, checksum) VALUES (?, ?, ?)').run(version, new Date().toISOString(), checksum);
      db.exec('COMMIT');
      results.push({ version, file, applied: true, checksum });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return results;
}

function rows(db, sql) {
  return db.prepare(sql).all();
}

function verifyDatabase(db) {
  const integrityRow = db.prepare('PRAGMA integrity_check').get();
  const integrity = integrityRow.integrity_check;
  const foreignKeyViolations = rows(db, 'PRAGMA foreign_key_check');
  const orphanChecks = {
    artifacts: 'SELECT a.id FROM artifacts a LEFT JOIN episodes e ON e.id=a.episode_id WHERE e.id IS NULL',
    noteVersions: 'SELECT n.id FROM note_versions n LEFT JOIN episodes e ON e.id=n.episode_id LEFT JOIN artifacts a ON a.id=n.artifact_id WHERE e.id IS NULL OR a.id IS NULL',
    qcRuns: 'SELECT q.id FROM qc_runs q LEFT JOIN episodes e ON e.id=q.episode_id LEFT JOIN artifacts a ON a.id=q.artifact_id WHERE e.id IS NULL OR a.id IS NULL',
    episodeEntities: 'SELECT ee.episode_id FROM episode_entities ee LEFT JOIN episodes e ON e.id=ee.episode_id LEFT JOIN entities x ON x.id=ee.entity_id WHERE e.id IS NULL OR x.id IS NULL',
    episodeThemes: 'SELECT et.episode_id FROM episode_themes et LEFT JOIN episodes e ON e.id=et.episode_id LEFT JOIN themes t ON t.id=et.theme_id WHERE e.id IS NULL OR t.id IS NULL',
    claims: 'SELECT c.id FROM claims c LEFT JOIN episodes e ON e.id=c.episode_id LEFT JOIN artifacts a ON a.id=c.source_artifact_id WHERE e.id IS NULL OR a.id IS NULL',
    externalIds: 'SELECT x.id FROM episode_external_ids x LEFT JOIN episodes e ON e.id=x.episode_id WHERE e.id IS NULL',
    productionQueue: 'SELECT p.episode_id FROM production_queue p LEFT JOIN episodes e ON e.id=p.episode_id WHERE e.id IS NULL',
  };
  const orphans = Object.fromEntries(Object.entries(orphanChecks).map(([key, sql]) => [key, rows(db, sql)]));
  const duplicateIdentities = rows(db, `SELECT id_type, id_value, COUNT(*) AS count FROM episode_external_ids
    WHERE id_type IN ('rss_guid','youtube_id','canonical_url') GROUP BY id_type,id_value HAVING COUNT(*) > 1`);
  const readyWithoutCanonicalNote = rows(db, `SELECT e.id FROM episodes e LEFT JOIN note_versions n ON n.episode_id=e.id AND n.canonical=1
    WHERE e.reader_ready=1 AND (n.id IS NULL OR n.note_text='' OR n.char_count<800)`);
  const readyWithFailedQc = rows(db, `SELECT e.id FROM episodes e WHERE e.reader_ready=1 AND NOT EXISTS
    (SELECT 1 FROM qc_runs q JOIN note_versions n ON n.artifact_id=q.artifact_id WHERE n.episode_id=e.id AND n.canonical=1 AND q.passed=1)`);
  const invalidReadyState = rows(db, `SELECT id FROM episodes WHERE public_ready=1 AND reader_ready=0
    UNION ALL SELECT e.id FROM episodes e JOIN production_queue p ON p.episode_id=e.id WHERE e.reader_ready=1`);
  const duplicateCanonicalEpisodes = rows(db, `SELECT show_id,published_date,normalized_title,COUNT(*) AS count FROM episodes
    WHERE published_date IS NOT NULL AND normalized_title<>'' GROUP BY show_id,published_date,normalized_title HAVING COUNT(*)>1`);
  const ftsOrphans = rows(db, 'SELECT episode_id FROM episode_search WHERE episode_id NOT IN (SELECT id FROM episodes)');
  const ok = integrity === 'ok' && foreignKeyViolations.length === 0 && Object.values(orphans).every(value => value.length === 0)
    && duplicateIdentities.length === 0 && duplicateCanonicalEpisodes.length === 0 && readyWithoutCanonicalNote.length === 0
    && readyWithFailedQc.length === 0 && invalidReadyState.length === 0 && ftsOrphans.length === 0;
  return { ok, integrity, foreignKeyViolations, orphans, duplicateIdentities, duplicateCanonicalEpisodes,
    readyWithoutCanonicalNote, readyWithFailedQc, invalidReadyState, ftsOrphans };
}

module.exports = { APP_DIR, DEFAULT_DB_PATH, MIGRATIONS_DIR, openDatabase, migrateDatabase, migrationFiles, verifyDatabase, sha256 };
