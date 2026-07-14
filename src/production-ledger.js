'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DEFAULT_DB_PATH, openDatabase } = require('./library-database');

const APP_DIR = path.resolve(__dirname, '..');
const PRODUCTION_LEDGER_VERSION = 'podcast-production-ledger-v1';
const DEFAULT_LEDGER_PATH = path.join(APP_DIR, 'data', 'private', 'podcast_production_state.json');
const DEFAULT_ARCHIVE_ROOT = '[podcast-archive]';
const DEFAULT_CLAIM_SECONDS = 30 * 60;

function iso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid timestamp: ${value}`);
  return date.toISOString();
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function fileExists(file) { try { return fs.statSync(file).isFile(); } catch (_) { return false; } }
function parseJson(value, fallback) { try { return JSON.parse(value); } catch (_) { return fallback; } }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

function readLedger(ledgerPath = DEFAULT_LEDGER_PATH, options = {}) {
  const resolved = path.resolve(ledgerPath);
  if (!fileExists(resolved)) {
    if (options.required) throw new Error(`production ledger does not exist: ${resolved}`);
    return null;
  }
  const ledger = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  if (ledger.version !== PRODUCTION_LEDGER_VERSION || !Array.isArray(ledger.episodes)) {
    throw new Error(`unsupported or corrupt production ledger: ${resolved}`);
  }
  return ledger;
}

function writeLedger(ledgerPath, ledger) {
  const resolved = path.resolve(ledgerPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporary = `${resolved}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  fs.writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  fs.renameSync(temporary, resolved);
  return ledger;
}

function withLedgerLock(ledgerPath, callback) {
  const resolved = path.resolve(ledgerPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const lockPath = `${resolved}.lock`;
  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`production ledger is locked: ${lockPath}`);
    throw error;
  }
  try { return callback(); }
  finally {
    try { if (descriptor != null) fs.closeSync(descriptor); } catch (_) { /* already closed */ }
    try { fs.unlinkSync(lockPath); } catch (_) { /* cleanup best effort */ }
  }
}

function planPriority(row, transcriptCandidates) {
  let score = Number(row.queue_priority || 0);
  const title = `${row.canonical_title || ''} ${row.description || ''}`;
  const tier = String(row.tier || '').toLowerCase();
  if (transcriptCandidates.length) score += 10_000;
  if (/tier\s*a|core/.test(tier)) score += 1_000;
  else if (/tier\s*b|priority/.test(tier)) score += 500;
  if (/invest like the best/i.test(row.show_name) && /(?:ep\.?\s*481|jeremy giffon)/i.test(title)) score += 900;
  if (/(?:investor|venture|pre[- ]?ipo|semiconductor|chip|hbm|compute|power|energy|ai infra|infrastructure)/i.test(title)) score += 700;
  if (Number(row.duration_seconds || 0) >= 2700) score += 300;
  if (/bloomberg/i.test(row.show_name) || Number(row.duration_seconds || 0) < 1200) score -= 200;
  return score;
}

function sourceBoundary(source, pathValue) {
  const labels = {
    attached_transcript: 'Reused attached transcript artifact; content remains bounded to this validated transcript and official episode metadata.',
    official_page: 'Transcript extracted from the official episode page and accepted only after completeness validation.',
    youtube_transcript_api: 'Transcript obtained from YouTube timed captions through the transcript API path; caption errors remain possible.',
    yt_dlp_captions: 'Transcript obtained from YouTube subtitles or auto-captions with yt-dlp; caption errors remain possible.',
    third_party_youtube_subtitle: 'Transcript obtained from an explicitly labelled third-party YouTube subtitle source; attribution and caption errors remain possible.',
    official_rss_audio_asr: 'Transcript produced locally from official RSS audio with faster-whisper; ASR names, numbers, and punctuation require verification.',
  };
  return `${labels[source] || 'Transcript source has not yet been validated.'}${pathValue ? ` Artifact: ${path.basename(pathValue)}.` : ''}`;
}

function databaseRows(db, since) {
  const episodes = db.prepare(`SELECT e.id,e.show_id,e.canonical_title,e.published_at,e.published_date,e.duration_seconds,e.duration_text,
      e.description,e.original_url,e.audio_url,e.media_type,e.materiality,e.production_status,e.reader_ready,e.gate_version,e.block_reasons_json,
      e.canonical_source_type,
      s.canonical_name AS show_name,s.tier,s.official_feed_url,s.official_page_url,
      p.priority AS queue_priority,p.status AS queue_status,p.missing_transcript,p.missing_note,p.missing_qc,p.missing_metadata,
      p.reason_codes_json,p.next_action AS queue_next_action,p.updated_at AS queue_updated_at
    FROM production_queue p JOIN episodes e ON e.id=p.episode_id JOIN shows s ON s.id=e.show_id
    WHERE e.canonical_source_type='official_rss' AND e.published_date>=? AND e.reader_ready=0`).all(since);
  const artifactStatement = db.prepare(`SELECT artifact_type,origin_path,safe_download_name,sha256,bytes,mime_type,source_layer,mtime
    FROM artifacts WHERE episode_id=? AND artifact_type IN ('transcript_txt','transcript_json')
    ORDER BY CASE artifact_type WHEN 'transcript_txt' THEN 0 ELSE 1 END,bytes DESC,origin_path`);
  const externalStatement = db.prepare(`SELECT id_type,id_value,source FROM episode_external_ids WHERE episode_id=?
    ORDER BY id_type,id_value`);
  return episodes.map(row => ({ row, artifacts: artifactStatement.all(row.id), externalIds: externalStatement.all(row.id) }));
}

function mergeEpisode(existing, record, archiveRoot, now) {
  const { row, artifacts, externalIds } = record;
  const candidates = artifacts.map(artifact => ({ path: artifact.origin_path, type: artifact.artifact_type, bytes: Number(artifact.bytes),
    sha256: artifact.sha256, mimeType: artifact.mime_type, sourceLayer: artifact.source_layer, mtime: artifact.mtime }));
  const previousTranscript = existing?.transcript || {};
  const validatedStillExists = previousTranscript.state === 'validated' && fileExists(previousTranscript.validatedPath);
  const transcript = {
    candidates,
    state: validatedStillExists ? 'validated' : candidates.length ? 'candidate_attached' : 'missing',
    source: validatedStillExists ? previousTranscript.source : null,
    sourceLabel: validatedStillExists ? previousTranscript.sourceLabel : null,
    sourceBoundary: validatedStillExists ? previousTranscript.sourceBoundary : null,
    validatedPath: validatedStillExists ? previousTranscript.validatedPath : null,
    structuredPath: validatedStillExists ? previousTranscript.structuredPath || null : null,
    validation: validatedStillExists ? previousTranscript.validation : null,
    validatedAt: validatedStillExists ? previousTranscript.validatedAt : null,
  };
  const artifactDir = path.join(path.resolve(archiveRoot), row.published_date, row.id);
  const defaultStage = transcript.state === 'validated' ? 'transcript_ready' : candidates.length ? 'validate_transcript' : 'acquire_transcript';
  const previousStage = existing?.currentStage;
  const preserveStage = ['claimed', 'running', 'transcript_ready', 'work_packet_ready', 'note_ready', 'qc_ready', 'released',
    'blocked_source_unavailable'].includes(previousStage);
  return {
    id: row.id,
    showId: row.show_id,
    show: row.show_name,
    title: row.canonical_title,
    publishedAt: row.published_at,
    publishedDate: row.published_date,
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    duration: row.duration_text || '',
    description: row.description || '',
    originalUrl: row.original_url || '',
    audioUrl: row.audio_url || '',
    canonicalSourceType: row.canonical_source_type || '',
    officialRssEnclosure: row.canonical_source_type === 'official_rss',
    officialRssEnclosureUrl: row.canonical_source_type === 'official_rss' ? row.audio_url || '' : '',
    officialFeedUrl: row.official_feed_url || '',
    officialShowUrl: row.official_page_url || '',
    youtubeIds: externalIds.filter(item => item.id_type === 'youtube_id').map(item => item.id_value),
    externalIds: externalIds.map(item => ({ type: item.id_type, value: item.id_value, source: item.source })),
    tier: row.tier || 'standard',
    materiality: row.materiality || 'unknown',
    queuePriority: Number(row.queue_priority || 0),
    planPriority: planPriority(row, candidates),
    artifactDir,
    transcript,
    note: { state: row.missing_note ? existing?.note?.state || 'missing' : 'attached', path: existing?.note?.path || null },
    qc: { state: row.missing_qc ? existing?.qc?.state || 'missing' : 'attached', path: existing?.qc?.path || null },
    currentStage: preserveStage ? previousStage : defaultStage,
    attempts: Array.isArray(existing?.attempts) ? existing.attempts : [],
    claim: existing?.claim || null,
    firstPlannedAt: existing?.firstPlannedAt || now,
    updatedAt: now,
    lastError: existing?.lastError || null,
    nextAction: existing?.nextAction || (transcript.state === 'validated' ? 'generate_work_packet' : candidates.length ? 'validate_attached_transcript' : 'acquire_transcript'),
    retry: existing?.retry || { count: 0, nextAt: null },
    canonicalQueue: {
      status: row.queue_status,
      missingTranscript: Boolean(row.missing_transcript),
      missingNote: Boolean(row.missing_note),
      missingQc: Boolean(row.missing_qc),
      missingMetadata: Boolean(row.missing_metadata),
      reasonCodes: parseJson(row.reason_codes_json, []),
      nextAction: row.queue_next_action,
      updatedAt: row.queue_updated_at,
      gateVersion: row.gate_version,
    },
  };
}

function ledgerMetrics(episodes) {
  const count = state => episodes.filter(episode => episode.transcript.state === state).length;
  return {
    episodes: episodes.length,
    claimed: episodes.filter(episode => episode.claim).length,
    transcriptCandidates: episodes.filter(episode => episode.transcript.candidates.length).length,
    transcriptsValidated: count('validated'),
    transcriptsMissing: episodes.filter(episode => episode.transcript.state !== 'validated').length,
    transcriptCandidatesPending: episodes.filter(episode => episode.transcript.state === 'candidate_attached').length,
    workPackets: episodes.filter(episode => fileExists(path.join(episode.artifactDir, 'work_packet.json'))).length,
    released: episodes.filter(episode => episode.currentStage === 'released').length,
    blockedSourceUnavailable: episodes.filter(episode => episode.currentStage === 'blocked_source_unavailable').length,
  };
}

function buildProductionPlan(options = {}) {
  const dbPath = path.resolve(options.dbPath || DEFAULT_DB_PATH);
  const ledgerPath = path.resolve(options.ledgerPath || DEFAULT_LEDGER_PATH);
  const archiveRoot = path.resolve(options.archiveRoot || DEFAULT_ARCHIVE_ROOT);
  const since = String(options.since || '2026-07-01');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error(`invalid --since date: ${since}`);
  const now = iso(options.now || new Date());
  return withLedgerLock(ledgerPath, () => {
    const previous = readLedger(ledgerPath) || null;
    const previousById = new Map((previous?.episodes || []).map(episode => [episode.id, episode]));
    const db = openDatabase(dbPath, { readOnly: true });
    let records;
    try { records = databaseRows(db, since); } finally { db.close(); }
    const imported = records.map(record => mergeEpisode(previousById.get(record.row.id), record, archiveRoot, now));
    const importedIds = new Set(imported.map(episode => episode.id));
    const completed = (previous?.episodes || []).filter(episode => !importedIds.has(episode.id)
      && ['released', 'blocked_source_unavailable'].includes(episode.currentStage));
    const episodes = [...imported, ...completed].sort((left, right) => right.planPriority - left.planPriority
      || String(left.publishedDate).localeCompare(String(right.publishedDate)) || left.id.localeCompare(right.id));
    const ledger = {
      version: PRODUCTION_LEDGER_VERSION,
      since,
      canonicalDbPath: dbPath,
      archiveRoot,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
      planGeneratedAt: now,
      planFingerprint: sha256(JSON.stringify(imported.map(episode => [episode.id, episode.title, episode.publishedDate]))),
      metrics: ledgerMetrics(episodes),
      episodes,
    };
    return writeLedger(ledgerPath, ledger);
  });
}

function updateEpisode(ledgerPath = DEFAULT_LEDGER_PATH, episodeId, updater, options = {}) {
  return withLedgerLock(ledgerPath, () => {
    const ledger = readLedger(ledgerPath, { required: true });
    const index = ledger.episodes.findIndex(episode => episode.id === episodeId);
    if (index < 0) throw new Error(`episode is not in production ledger: ${episodeId}`);
    const before = clone(ledger.episodes[index]);
    const updated = updater(before);
    if (!updated || updated.id !== episodeId) throw new Error('episode updater must retain episode identity');
    const now = iso(options.now || new Date());
    updated.updatedAt = now;
    ledger.episodes[index] = updated;
    ledger.updatedAt = now;
    ledger.metrics = ledgerMetrics(ledger.episodes);
    writeLedger(ledgerPath, ledger);
    return clone(updated);
  });
}

function recoverStaleClaims(ledgerPath = DEFAULT_LEDGER_PATH, options = {}) {
  return withLedgerLock(ledgerPath, () => {
    const ledger = readLedger(ledgerPath, { required: true });
    const now = iso(options.now || new Date());
    let recovered = 0;
    for (const episode of ledger.episodes) {
      if (!episode.claim || String(episode.claim.expiresAt) > now) continue;
      const previousStage = episode.claim.previousStage;
      episode.attempts.push({ stage: episode.currentStage, at: now, outcome: 'stale_claim_recovered', workerId: episode.claim.workerId });
      episode.claim = null;
      if (['claimed', 'running'].includes(episode.currentStage)) {
        episode.currentStage = previousStage || (episode.transcript.state === 'validated' ? 'transcript_ready'
          : episode.transcript.candidates.length ? 'validate_transcript' : 'acquire_transcript');
      }
      episode.nextAction = episode.currentStage === 'work_packet_ready' ? 'reasoning_agent_write_note_and_qc'
        : episode.transcript.state === 'validated' ? 'generate_work_packet'
          : episode.transcript.candidates.length ? 'validate_attached_transcript' : 'acquire_transcript';
      episode.updatedAt = now;
      recovered += 1;
    }
    ledger.updatedAt = now;
    ledger.metrics = ledgerMetrics(ledger.episodes);
    writeLedger(ledgerPath, ledger);
    return { recovered, now };
  });
}

function claimNextEpisode(ledgerPath = DEFAULT_LEDGER_PATH, options = {}) {
  return withLedgerLock(ledgerPath, () => {
    const ledger = readLedger(ledgerPath, { required: true });
    const now = iso(options.now || new Date());
    for (const episode of ledger.episodes) {
      if (episode.claim && String(episode.claim.expiresAt) <= now) {
        const previousStage = episode.claim.previousStage;
        episode.attempts.push({ stage: episode.currentStage, at: now, outcome: 'stale_claim_recovered', workerId: episode.claim.workerId });
        episode.claim = null;
        episode.currentStage = previousStage || (episode.transcript.state === 'validated' ? 'transcript_ready'
          : episode.transcript.candidates.length ? 'validate_transcript' : 'acquire_transcript');
      }
    }
    const eligible = ledger.episodes.find(episode => !episode.claim && episode.currentStage !== 'released'
      && (!episode.retry?.nextAt || episode.retry.nextAt <= now));
    if (!eligible) return null;
    const leaseSeconds = Math.max(30, Math.min(Number(options.leaseSeconds || DEFAULT_CLAIM_SECONDS), 24 * 60 * 60));
    const claim = {
      token: crypto.randomUUID(),
      workerId: String(options.workerId || `pid-${process.pid}`),
      claimedAt: now,
      expiresAt: new Date(new Date(now).getTime() + leaseSeconds * 1000).toISOString(),
      previousStage: eligible.currentStage,
    };
    eligible.claim = claim;
    eligible.currentStage = 'claimed';
    eligible.updatedAt = now;
    ledger.updatedAt = now;
    ledger.metrics = ledgerMetrics(ledger.episodes);
    writeLedger(ledgerPath, ledger);
    return { episode: clone(eligible), claim: clone(claim) };
  });
}

function claimEpisode(ledgerPath = DEFAULT_LEDGER_PATH, episodeId, options = {}) {
  return withLedgerLock(ledgerPath, () => {
    const ledger = readLedger(ledgerPath, { required: true });
    const episode = ledger.episodes.find(item => item.id === episodeId);
    if (!episode) throw new Error(`episode is not in production ledger: ${episodeId}`);
    const now = iso(options.now || new Date());
    if (episode.claim && String(episode.claim.expiresAt) > now && episode.claim.workerId !== String(options.workerId || `pid-${process.pid}`)) {
      throw new Error(`episode is already claimed by ${episode.claim.workerId} until ${episode.claim.expiresAt}`);
    }
    const leaseSeconds = Math.max(30, Math.min(Number(options.leaseSeconds || DEFAULT_CLAIM_SECONDS), 24 * 60 * 60));
    const claim = { token: crypto.randomUUID(), workerId: String(options.workerId || `pid-${process.pid}`), claimedAt: now,
      expiresAt: new Date(new Date(now).getTime() + leaseSeconds * 1000).toISOString(), previousStage: episode.currentStage };
    episode.claim = claim; episode.currentStage = 'claimed'; episode.updatedAt = now; ledger.updatedAt = now;
    ledger.metrics = ledgerMetrics(ledger.episodes); writeLedger(ledgerPath, ledger);
    return { episode: clone(episode), claim: clone(claim) };
  });
}

function productionStatus(ledgerPath = DEFAULT_LEDGER_PATH) {
  const ledger = readLedger(ledgerPath, { required: true });
  return { version: ledger.version, since: ledger.since, updatedAt: ledger.updatedAt, metrics: ledgerMetrics(ledger.episodes),
    stages: Object.fromEntries([...new Set(ledger.episodes.map(episode => episode.currentStage))].sort()
      .map(stage => [stage, ledger.episodes.filter(episode => episode.currentStage === stage).length])) };
}

module.exports = {
  PRODUCTION_LEDGER_VERSION,
  DEFAULT_LEDGER_PATH,
  DEFAULT_ARCHIVE_ROOT,
  buildProductionPlan,
  claimEpisode,
  claimNextEpisode,
  ledgerMetrics,
  productionStatus,
  readLedger,
  recoverStaleClaims,
  sourceBoundary,
  updateEpisode,
  writeLedger,
};
