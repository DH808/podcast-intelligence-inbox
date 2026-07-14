'use strict';

const fs = require('fs');
const path = require('path');
const { openDatabase } = require('./library-database');
const { DEFAULT_QUERIES_ROOT, DEFAULT_RAW_REPORTS_ROOT, DEFAULT_REPORTS_DIR, officialRssEpisodeSourceUrl,
  rebuildLibrary, verifyLibrary } = require('./library-import');
const { LibraryRepository } = require('./library-repository');
const { readLedger, updateEpisode } = require('./production-ledger');
const { sha256 } = require('./production-files');
const { outputPaths, validateAgentOutputs } = require('./production-validation');

const VERSIONED_WORK_PACKET = /^work_packet\.([a-f0-9]{12})\.json$/;

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function isFile(file) {
  try { return fs.statSync(file).isFile(); } catch (_) { return false; }
}

function exactEpisodeIdentity(packet, episode) {
  const expected = {
    id: episode.id,
    showId: episode.showId || null,
    show: episode.show,
    title: episode.title,
    publishedAt: episode.publishedAt || episode.publishedDate,
    publishedDate: episode.publishedDate,
    durationSeconds: episode.durationSeconds,
    description: episode.description || '',
    originalUrl: officialRssEpisodeSourceUrl(episode),
    audioUrl: episode.audioUrl || '',
    tier: episode.tier || 'standard',
    materiality: episode.materiality || 'unknown',
  };
  return canonicalJson(packet?.episode) === canonicalJson(expected);
}

function releaseCriticalFingerprint(packet) {
  const critical = {
    format: packet.format,
    episode: packet.episode,
    transcript: packet.transcript,
    writing: packet.writing,
    quality: packet.quality,
    outputs: packet.outputs,
    constraints: packet.constraints,
    artifactSha256: {
      transcript: sha256(fs.readFileSync(packet.transcript.path)),
      noteMarkdown: sha256(fs.readFileSync(packet.outputs.noteMarkdown)),
      qcJson: sha256(fs.readFileSync(packet.outputs.qcJson)),
    },
  };
  return sha256(canonicalJson(critical));
}

function inspectWorkPacket(packetPath, episode) {
  const reasons = []; let packet; let bytes;
  try {
    bytes = fs.readFileSync(packetPath);
    packet = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    return { packetPath, valid: false, reasons: [`invalid_json:${error.message}`] };
  }
  const versioned = path.basename(packetPath).match(VERSIONED_WORK_PACKET);
  if (versioned && sha256(JSON.stringify(packet)).slice(0, 12) !== versioned[1]) reasons.push('content_address_mismatch');
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    return { packetPath, packet, valid: false, reasons: [...reasons, 'work_packet_invalid'].sort() };
  }
  if (!exactEpisodeIdentity(packet, episode)) reasons.push('episode_identity_mismatch');
  const canonicalOutputs = outputPaths(episode);
  if (!Object.entries(canonicalOutputs).every(([key, value]) => packet.outputs?.[key] === value)) {
    reasons.push('noncanonical_output_paths');
  }
  if (!isFile(packet.transcript?.path)) reasons.push('transcript_missing');
  if (!isFile(packet.outputs?.noteMarkdown)) reasons.push('note_missing');
  if (!isFile(packet.outputs?.qcJson)) reasons.push('qc_missing');
  let validation;
  if (!reasons.length) {
    try { validation = validateAgentOutputs(packet); }
    catch (error) { reasons.push(`validation_error:${error.message}`); }
    if (validation && !validation.valid) reasons.push(...validation.reasons.map(reason => `validation:${reason}`));
  }
  if (reasons.length) return { packetPath, packet, valid: false, reasons: [...new Set(reasons)].sort() };
  return { packetPath, packet, bytes, validation, valid: true, fingerprint: releaseCriticalFingerprint(packet) };
}

function selectReleaseWorkPacket(episode) {
  const artifactDir = path.resolve(episode.artifactDir || '');
  let names = [];
  try {
    names = fs.readdirSync(artifactDir, { withFileTypes: true }).filter(entry => entry.isFile()
      && (entry.name === 'work_packet.json' || VERSIONED_WORK_PACKET.test(entry.name))).map(entry => entry.name).sort((left, right) => {
        if (left === 'work_packet.json') return -1;
        if (right === 'work_packet.json') return 1;
        return left.localeCompare(right);
      });
  } catch (_) { /* Report the missing/unreadable directory as no valid packet below. */ }
  const inspected = names.map(name => inspectWorkPacket(path.join(artifactDir, name), episode));
  const valid = inspected.filter(candidate => candidate.valid);
  if (!valid.length) {
    const detail = inspected.length ? `: ${inspected.map(candidate => `${path.basename(candidate.packetPath)} [${candidate.reasons.join(', ')}]`).join('; ')}` : '';
    throw new Error(`no valid release work packet for episode ${episode.id}${detail}`);
  }
  const fingerprints = new Set(valid.map(candidate => candidate.fingerprint));
  if (fingerprints.size > 1) {
    throw new Error(`ambiguous valid release work packets for episode ${episode.id}: ${valid.map(candidate => path.basename(candidate.packetPath)).join(', ')}`);
  }
  return valid[0];
}

function assertReleaseTransition(input = {}) {
  if (input.episodeWasReady) throw new Error('release target was already ready before release');
  const readyDelta = Number(input.afterReady) - Number(input.beforeReady);
  if (readyDelta !== 1) throw new Error(`release must increase ready count by exactly one; observed ${readyDelta}`);
  if (!input.episodeIsReady) throw new Error('release target did not become ready');
  if (!input.detail || input.detail.id !== input.episodeId) throw new Error('released episode detail is unavailable or mismatched');
  if (!Array.isArray(input.searchEpisodeIds) || !input.searchEpisodeIds.includes(input.episodeId)) throw new Error('released episode is not searchable');
  return { readyDelta };
}

function snapshot(dbPath, episodeId, query) {
  const db = openDatabase(dbPath, { readOnly: true });
  try {
    const repository = new LibraryRepository(db);
    const row = db.prepare('SELECT reader_ready FROM episodes WHERE id=?').get(episodeId);
    const ready = Number(db.prepare('SELECT COUNT(*) AS count FROM episodes WHERE reader_ready=1').get().count);
    const detail = repository.episode(episodeId);
    const searchEpisodeIds = repository.search(query, { limit: 100 }).episodes.map(episode => episode.id);
    return { ready, episodeReady: Boolean(row?.reader_ready), detail, searchEpisodeIds };
  } finally { db.close(); }
}

function releaseEpisode(options = {}) {
  if (!options.episodeId) throw new Error('--episode is required for release');
  const ledger = readLedger(options.ledgerPath, { required: true });
  const episode = ledger.episodes.find(item => item.id === options.episodeId);
  if (!episode) throw new Error(`episode is not in production ledger: ${options.episodeId}`);
  const selectedPacket = selectReleaseWorkPacket(episode);
  const { packetPath, packet, validation } = selectedPacket;
  const dbPath = path.resolve(options.dbPath || ledger.canonicalDbPath);
  const query = episode.title;
  const before = snapshot(dbPath, episode.id, query);
  if (before.episodeReady) throw new Error('release target is already ready');
  let stagedTransition;
  let rebuild;
  try {
    rebuild = rebuildLibrary({
      dbPath,
      radarRoot: options.radarRoot || ledger.archiveRoot,
      queriesRoot: options.queriesRoot || DEFAULT_QUERIES_ROOT,
      rawReportsRoot: options.rawReportsRoot || DEFAULT_RAW_REPORTS_ROOT,
      reportsDir: options.reportsDir || DEFAULT_REPORTS_DIR,
      since: options.since || ledger.since,
      validateStaged(stagedDb) {
        const repository = new LibraryRepository(stagedDb);
        const row = stagedDb.prepare('SELECT reader_ready FROM episodes WHERE id=?').get(episode.id);
        const afterReady = Number(stagedDb.prepare('SELECT COUNT(*) AS count FROM episodes WHERE reader_ready=1').get().count);
        const detail = repository.episode(episode.id);
        const searchEpisodeIds = repository.search(query, { limit: 100 }).episodes.map(item => item.id);
        stagedTransition = assertReleaseTransition({ beforeReady: before.ready, afterReady, episodeWasReady: before.episodeReady,
          episodeIsReady: Boolean(row?.reader_ready), detail, searchEpisodeIds, episodeId: episode.id });
        if (options.dryRun) throw Object.assign(new Error('release dry-run passed staged validation'), { code: 'RELEASE_DRY_RUN_PASSED' });
      },
    });
  } catch (error) {
    if (error.code === 'RELEASE_DRY_RUN_PASSED') return { ok: true, dryRun: true, episodeId: episode.id,
      beforeReady: before.ready, packetPath, stagedTransition, validation };
    throw error;
  }
  if (options.dryRun) throw new Error('release dry-run did not stop before database replacement');
  const verification = verifyLibrary({ dbPath, reportsDir: options.reportsDir || DEFAULT_REPORTS_DIR, since: options.since || ledger.since });
  const after = snapshot(dbPath, episode.id, query);
  const transition = assertReleaseTransition({ beforeReady: before.ready, afterReady: after.ready, episodeWasReady: before.episodeReady,
    episodeIsReady: after.episodeReady, detail: after.detail, searchEpisodeIds: after.searchEpisodeIds, episodeId: episode.id });
  updateEpisode(options.ledgerPath, episode.id, current => ({ ...current, currentStage: 'released', claim: null, lastError: null,
    nextAction: 'released', note: { state: 'validated', path: packet.outputs.noteMarkdown }, qc: { state: 'validated', path: packet.outputs.qcJson },
    attempts: [...current.attempts, { stage: 'release', at: new Date().toISOString(), outcome: 'released', readyDelta: transition.readyDelta }] }));
  return { ok: true, episodeId: episode.id, packetPath, beforeReady: before.ready, afterReady: after.ready, transition,
    stagedTransition, validation, rebuildCounts: rebuild.counts, verification: { ok: verification.ok, integrity: verification.database.integrity } };
}

module.exports = { assertReleaseTransition, releaseEpisode, selectReleaseWorkPacket, snapshot };
