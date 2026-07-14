#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  DEFAULT_ARCHIVE_ROOT,
  DEFAULT_LEDGER_PATH,
  buildProductionPlan,
  claimEpisode,
  claimNextEpisode,
  productionStatus,
  readLedger,
  recoverStaleClaims,
  updateEpisode,
} = require('../src/production-ledger');
const { DEFAULT_DB_PATH } = require('../src/library-database');
const { acquireAndStoreTranscript } = require('../src/transcript-acquisition');
const { generateWorkPacket, validateAgentOutputs } = require('../src/production-validation');
const { releaseEpisode } = require('../src/production-release');
const { promoteEpisode, stageEpisode } = require('../src/production-staging');
const { copyAdditive, sha256File } = require('../src/production-files');

function argumentsFrom(values) {
  const result = { command: values[0] || '', keepAudio: false, dryRun: false, attachedOnly: false };
  const paths = new Set(['--db', '--ledger', '--archive-root', '--radar-root', '--queries-root', '--raw-reports-root', '--reports-dir', '--transcript-path', '--destination-root', '--staging-root']);
  const strings = new Set(['--since', '--episode', '--worker', '--third-party-template', '--asr-model', '--asr-device', '--source-label']);
  const numbers = new Set(['--lease-seconds', '--limit', '--maximum-audio-bytes', '--maximum-asr-wall-seconds', '--maximum-asr-duration-seconds']);
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index]; const next = values[index + 1];
    if (value === '--keep-audio') result.keepAudio = true;
    else if (value === '--dry-run') result.dryRun = true;
    else if (value === '--attached-only') result.attachedOnly = true;
    else if (paths.has(value) && next) { result[value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = path.resolve(next); index += 1; }
    else if (strings.has(value) && next) { result[value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = next; index += 1; }
    else if (numbers.has(value) && next && Number.isFinite(Number(next))) {
      result[value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = Number(next); index += 1;
    } else throw new Error(`unknown or incomplete argument: ${value}`);
  }
  return result;
}

function optionsFrom(args) {
  return {
    dbPath: args.db || DEFAULT_DB_PATH,
    ledgerPath: args.ledger || DEFAULT_LEDGER_PATH,
    archiveRoot: args.archiveRoot || DEFAULT_ARCHIVE_ROOT,
    since: args.since || '2026-07-01',
  };
}
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function episodeFromLedger(ledgerPath, episodeId) {
  const episode = readLedger(ledgerPath, { required: true }).episodes.find(item => item.id === episodeId);
  if (!episode) throw new Error(`episode is not in production ledger: ${episodeId}`);
  return episode;
}

function titleScore(left, right) {
  const tokens = value => new Set(String(value || '').toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(token => token.length > 2));
  const a = tokens(left); const b = tokens(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter(token => b.has(token)).length / Math.min(a.size, b.size);
}
function localTranscriptProvider(args, episode) {
  if (!args.transcriptPath) return null;
  if (!args.sourceLabel) throw new Error('--source-label is required with --transcript-path');
  const allowed = new Set(['attached_transcript', 'official_page', 'youtube_transcript_api', 'yt_dlp_captions',
    'third_party_youtube_subtitle', 'official_rss_audio_asr']);
  if (!allowed.has(args.sourceLabel)) throw new Error(`unsupported --source-label: ${args.sourceLabel}`);
  if (!fs.existsSync(args.transcriptPath) || !fs.statSync(args.transcriptPath).isFile()) throw new Error(`transcript file does not exist: ${args.transcriptPath}`);
  const metadataPath = path.join(path.dirname(args.transcriptPath), 'metadata.json');
  if (!fs.existsSync(metadataPath)) throw new Error('local transcript requires sibling metadata.json identity evidence');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const urls = [metadata.url, metadata.podcast_url, metadata.youtube_url].filter(Boolean);
  const urlMatch = urls.includes(episode.originalUrl) || (episode.youtubeIds || []).some(id => urls.some(url => String(url).includes(id)));
  if (metadata.episode_id && metadata.episode_id !== episode.id) throw new Error('local transcript metadata episode identity mismatch');
  if (!urlMatch && titleScore(metadata.title, episode.title) < 0.55) throw new Error('local transcript metadata title/URL does not match episode');
  return { source: args.sourceLabel, sourcePath: args.transcriptPath, text: fs.readFileSync(args.transcriptPath, 'utf8') };
}

function acquisitionOptions(args, attachedOnly, episode) {
  const options = {
    keepAudio: args.keepAudio,
    thirdPartyTemplate: args.thirdPartyTemplate,
    asrModel: args.asrModel,
    asrDevice: args.asrDevice,
    maximumAudioBytes: args.maximumAudioBytes,
    maximumAsrWallSeconds: args.maximumAsrWallSeconds,
    maximumAsrDurationSeconds: args.maximumAsrDurationSeconds,
  };
  if (args.transcriptPath) {
    options.providers = Object.fromEntries([
      'attached_transcript', 'official_page', 'youtube_transcript_api', 'yt_dlp_captions', 'third_party_youtube_subtitle', 'official_rss_audio_asr',
    ].map(name => [name, name === args.sourceLabel ? () => localTranscriptProvider(args, episode) : () => null]));
    return options;
  }
  if (attachedOnly) options.providers = Object.fromEntries([
    'official_page', 'youtube_transcript_api', 'yt_dlp_captions', 'third_party_youtube_subtitle', 'official_rss_audio_asr',
  ].map(name => [name, () => null]));
  return options;
}

function acquireOne(args, config, episodeId, attachedOnly = false) {
  claimEpisode(config.ledgerPath, episodeId, { workerId: args.worker, leaseSeconds: args.leaseSeconds });
  const episode = episodeFromLedger(config.ledgerPath, episodeId);
  const startedAt = new Date().toISOString();
  try {
    const result = acquireAndStoreTranscript(episode, acquisitionOptions(args, attachedOnly, episode));
    const updated = updateEpisode(config.ledgerPath, episodeId, current => ({
      ...current,
      transcript: { ...current.transcript, state: 'validated', source: result.source, sourceLabel: result.sourceLabel,
        sourceBoundary: result.sourceBoundary, validatedPath: result.validatedPath, structuredPath: result.structuredPath,
        validation: result.validation, validatedAt: new Date().toISOString() },
      currentStage: 'transcript_ready', claim: null, lastError: null, nextAction: 'generate_work_packet',
      attempts: [...current.attempts, ...result.attempts.map(attempt => ({ stage: 'transcript_acquisition', at: startedAt, ...attempt })),
        { stage: 'transcript_acquisition', at: new Date().toISOString(), source: result.source, outcome: 'validated', validation: result.validation }],
    }));
    return { ok: true, episodeId, source: result.source, transcriptPath: result.validatedPath, validation: result.validation,
      currentStage: updated.currentStage };
  } catch (error) {
    const attempts = Array.isArray(error.attempts) ? error.attempts : [];
    updateEpisode(config.ledgerPath, episodeId, current => ({ ...current, claim: null,
      currentStage: attachedOnly ? 'acquire_transcript' : 'blocked_source_unavailable',
      nextAction: attachedOnly ? 'acquire_transcript' : 'retry_transcript_acquisition', lastError: String(error.message || error),
      retry: attachedOnly ? current.retry : { count: Number(current.retry?.count || 0) + 1,
        nextAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
      attempts: [...current.attempts, ...attempts.map(attempt => ({ stage: 'transcript_acquisition', at: startedAt, ...attempt })),
        { stage: 'transcript_acquisition', at: new Date().toISOString(), outcome: 'failed', error: String(error.message || error) }],
    }));
    throw error;
  }
}

function validateCommand(args, config) {
  const ledger = readLedger(config.ledgerPath, { required: true });
  const ids = args.episode ? [args.episode] : ledger.episodes.filter(episode => episode.transcript.candidates.length
    && episode.transcript.state !== 'validated').map(episode => episode.id);
  const results = [];
  for (const id of ids) {
    const episode = episodeFromLedger(config.ledgerPath, id);
    const packetPath = path.join(episode.artifactDir, 'work_packet.json');
    if (fs.existsSync(packetPath) && fs.existsSync(path.join(episode.artifactDir, 'notes_cn_source_faithful.md'))) {
      const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
      results.push({ episodeId: id, outputs: validateAgentOutputs(packet) });
      continue;
    }
    try { results.push(acquireOne(args, config, id, true)); }
    catch (error) { results.push({ ok: false, episodeId: id, error: error.message, attempts: error.attempts || [] }); }
  }
  return { ok: results.every(result => result.ok !== false), validated: results.filter(result => result.ok).length, failed: results.filter(result => result.ok === false).length, results };
}

function packetsCommand(args, config) {
  const ledger = readLedger(config.ledgerPath, { required: true });
  const limit = Math.max(1, Math.min(Number(args.limit || 6), 100));
  const episodes = args.episode ? [episodeFromLedger(config.ledgerPath, args.episode)]
    : ledger.episodes.filter(episode => episode.transcript.state === 'validated').slice(0, limit);
  const paths = [];
  for (const episode of episodes) {
    const packetPath = generateWorkPacket(episode);
    updateEpisode(config.ledgerPath, episode.id, current => ({ ...current, currentStage: 'work_packet_ready',
      nextAction: 'reasoning_agent_write_note_and_qc', attempts: [...current.attempts,
        { stage: 'work_packet', at: new Date().toISOString(), outcome: 'generated', path: packetPath }] }));
    paths.push({ episodeId: episode.id, packetPath });
  }
  return { ok: true, generated: paths.length, packets: paths };
}

function handoffCommand(args, config) {
  const ledger = readLedger(config.ledgerPath, { required: true });
  const sourceRoot = path.resolve(ledger.archiveRoot);
  const destinationRoot = path.resolve(args.destinationRoot || DEFAULT_ARCHIVE_ROOT);
  if (sourceRoot === destinationRoot) throw new Error('handoff source and destination are identical');
  const pending = [sourceRoot]; const files = [];
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(file);
      else if (entry.isFile()) files.push(file);
    }
  }
  const summary = { sourceRoot, destinationRoot, dryRun: args.dryRun, files: files.length, create: 0, identical: 0, conflicts: [] };
  for (const source of files.sort()) {
    const relative = path.relative(sourceRoot, source);
    if (!/^\d{4}-\d{2}-\d{2}[\\/]ep_[\w-]+[\\/][^\\/]+$/.test(relative)) throw new Error(`unexpected staged artifact path: ${relative}`);
    const destination = path.join(destinationRoot, relative);
    if (fs.existsSync(destination)) {
      if (!fs.statSync(destination).isFile() || sha256File(destination) !== sha256File(source)) summary.conflicts.push(relative);
      else summary.identical += 1;
    } else if (args.dryRun) summary.create += 1;
    else { copyAdditive(source, destination, { root: destinationRoot }); summary.create += 1; }
  }
  if (summary.conflicts.length) throw new Error(`handoff has ${summary.conflicts.length} conflicting existing artifacts: ${summary.conflicts.join(', ')}`);
  return { ok: true, ...summary };
}

function main(argv = process.argv.slice(2)) {
  const args = argumentsFrom(argv); const config = optionsFrom(args);
  if (args.command === 'plan') {
    const ledger = buildProductionPlan(config); print({ ok: true, ledgerPath: config.ledgerPath, metrics: ledger.metrics,
      planFingerprint: ledger.planFingerprint, episodeIds: ledger.episodes.map(episode => episode.id) });
  } else if (args.command === 'status') print({ ok: true, ...productionStatus(config.ledgerPath) });
  else if (args.command === 'select') {
    const ledger = readLedger(config.ledgerPath, { required: true });
    const eligible = episode => episode.currentStage !== 'released' && episode.nextAction !== 'released';
    const workPacketReady = ledger.episodes.find(episode => eligible(episode) && episode.currentStage === 'work_packet_ready');
    const acquireTranscript = ledger.episodes.find(episode => eligible(episode) && episode.currentStage === 'acquire_transcript'
      && (!episode.retry?.nextAt || new Date(episode.retry.nextAt).getTime() <= Date.now()));
    print({ ok: true, allReleased: ledger.episodes.every(episode => !eligible(episode)),
      workPacketReady: workPacketReady ? { episodeId: workPacketReady.id, publishedDate: workPacketReady.publishedDate,
        show: workPacketReady.show, title: workPacketReady.title } : null,
      acquireTranscript: acquireTranscript ? { episodeId: acquireTranscript.id, publishedDate: acquireTranscript.publishedDate,
        show: acquireTranscript.show, title: acquireTranscript.title } : null });
  }
  else if (args.command === 'next') {
    recoverStaleClaims(config.ledgerPath);
    print({ ok: true, next: claimNextEpisode(config.ledgerPath, { workerId: args.worker, leaseSeconds: args.leaseSeconds }) });
  } else if (args.command === 'acquire') {
    if (!args.episode) throw new Error('--episode is required for acquire');
    print(acquireOne(args, config, args.episode, args.attachedOnly));
  } else if (args.command === 'validate') print(validateCommand(args, config));
  else if (args.command === 'packets') print(packetsCommand(args, config));
  else if (args.command === 'stage') print(stageEpisode({ ...config, ...args, episodeId: args.episode }));
  else if (args.command === 'promote') print(promoteEpisode({ ...config, ...args, episodeId: args.episode }));
  else if (args.command === 'handoff') print(handoffCommand(args, config));
  else if (args.command === 'release') {
    print(releaseEpisode({ ...config, ...args, episodeId: args.episode, radarRoot: args.radarRoot || config.archiveRoot }));
  } else throw new Error('usage: production-cli.js <plan|status|next|acquire|validate|packets|stage|promote|handoff|release> [--episode ID] [--since YYYY-MM-DD]');
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); if (error.attempts) process.stderr.write(`${JSON.stringify({ attempts: error.attempts }, null, 2)}\n`); process.exitCode = 1; }
}

module.exports = { acquireOne, argumentsFrom, handoffCommand, main, optionsFrom, packetsCommand, validateCommand };
