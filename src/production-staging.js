'use strict';

const fs = require('fs');
const path = require('path');
const { readLedger } = require('./production-ledger');
const { assertWithin, sha256, writeAdditive } = require('./production-files');
const { buildWorkPacket, outputPaths, validateAgentOutputs } = require('./production-validation');

const APP_DIR = path.resolve(__dirname, '..');
const DEFAULT_STAGING_ROOT = path.join(APP_DIR, 'data', 'private', 'podcast_production_archive');
const SUPPORT_ARTIFACTS = Object.freeze(['metadata.json', 'source_manifest.json']);
const REQUIRED_RELEASE_OUTPUTS = Object.freeze(['noteMarkdown', 'qcJson']);
const RELEASE_OUTPUTS = Object.freeze(['noteMarkdown', 'noteDocx', 'qcJson', 'investmentExtraction', 'claimLedger']);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function serialized(value) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'string') return Buffer.from(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function regularFile(file, label) {
  let stat;
  try { stat = fs.lstatSync(file); } catch (_) { throw new Error(`${label} does not exist: ${file}`); }
  if (!stat.isFile()) throw new Error(`${label} is not a regular file: ${file}`);
  return stat;
}

function prepareWrites(entries, root) {
  const destinations = new Set();
  return entries.map(entry => {
    const destination = assertWithin(root, entry.destination);
    if (destinations.has(destination)) throw new Error(`duplicate production artifact destination: ${destination}`);
    destinations.add(destination);
    const content = serialized(entry.content);
    try {
      const stat = fs.lstatSync(destination);
      if (!stat.isFile() || !fs.readFileSync(destination).equals(content)) {
        throw new Error(`refusing to overwrite conflicting production artifact: ${destination}`);
      }
      return { destination, content, state: 'identical' };
    } catch (error) {
      if (error.code === 'ENOENT') return { destination, content, state: 'create' };
      throw error;
    }
  });
}

function commitWrites(prepared, root) {
  let created = 0; let identical = 0;
  for (const item of prepared) {
    const result = writeAdditive(item.destination, item.content, { root });
    if (result.created) created += 1;
    else identical += 1;
  }
  return { created, identical };
}

function canonicalEpisode(options = {}) {
  if (!options.episodeId) throw new Error('--episode is required');
  const ledger = readLedger(options.ledgerPath, { required: true });
  const episode = ledger.episodes.find(item => item.id === options.episodeId);
  if (!episode) throw new Error(`episode is not in production ledger: ${options.episodeId}`);
  const canonicalRoot = path.resolve(ledger.archiveRoot || '');
  const canonicalDir = path.join(canonicalRoot, String(episode.publishedDate || ''), episode.id);
  if (path.resolve(episode.artifactDir || '') !== canonicalDir) {
    throw new Error(`canonical episode directory mismatch for ${episode.id}: ${episode.artifactDir || '(missing)'}`);
  }
  const transcript = episode.transcript || {};
  if (transcript.state !== 'validated' || transcript.validation?.valid !== true
      || (Array.isArray(transcript.validation?.reasons) && transcript.validation.reasons.length)) {
    throw new Error(`episode does not have a validated canonical transcript: ${episode.id}`);
  }
  if (!transcript.validation.sha256) throw new Error(`validated canonical transcript has no SHA-256: ${episode.id}`);
  const transcriptName = path.basename(String(transcript.validatedPath || ''));
  if (transcriptName !== 'transcript_timestamped.txt') {
    throw new Error(`validated canonical transcript basename is not allowlisted: ${episode.id}`);
  }
  const transcriptPath = assertWithin(canonicalDir, path.join(canonicalDir, transcriptName));
  regularFile(transcriptPath, 'validated canonical transcript');
  const actualHash = sha256(fs.readFileSync(transcriptPath));
  if (actualHash !== transcript.validation.sha256) throw new Error(`validated canonical transcript hash mismatch: ${episode.id}`);
  if (!transcript.structuredPath) throw new Error(`validated canonical structured transcript is missing: ${episode.id}`);
  const structuredName = path.basename(String(transcript.structuredPath));
  if (structuredName !== 'transcript_structured.json') {
    throw new Error(`validated canonical structured transcript basename is not allowlisted: ${episode.id}`);
  }
  const structuredPath = assertWithin(canonicalDir, path.join(canonicalDir, structuredName));
  regularFile(structuredPath, 'validated canonical structured transcript');
  let structured;
  try { structured = JSON.parse(fs.readFileSync(structuredPath, 'utf8')); }
  catch (error) { throw new Error(`validated canonical structured transcript is invalid JSON: ${error.message}`); }
  if (structured.episode_id !== episode.id || structured.transcript_sha256 !== transcript.validation.sha256) {
    throw new Error(`validated canonical structured transcript identity/hash mismatch: ${episode.id}`);
  }
  for (const name of SUPPORT_ARTIFACTS) {
    const supportPath = path.join(canonicalDir, name);
    regularFile(supportPath, `canonical ${name}`);
    let support;
    try { support = JSON.parse(fs.readFileSync(supportPath, 'utf8')); }
    catch (error) { throw new Error(`canonical ${name} is invalid JSON: ${error.message}`); }
    if (support.episode_id !== episode.id) throw new Error(`canonical ${name} episode identity mismatch: ${episode.id}`);
  }
  return { ledger, episode, canonicalRoot, canonicalDir, transcriptPath, structuredPath };
}

function canonicalizedEpisode(context) {
  return {
    ...context.episode,
    artifactDir: context.canonicalDir,
    transcript: {
      ...context.episode.transcript,
      validatedPath: context.transcriptPath,
      structuredPath: context.structuredPath,
    },
  };
}

function stagedEpisode(context, stagingDir) {
  const transcriptPath = path.join(stagingDir, path.basename(context.transcriptPath));
  const structuredPath = path.join(stagingDir, path.basename(context.structuredPath));
  return {
    ...context.episode,
    artifactDir: stagingDir,
    transcript: { ...context.episode.transcript, validatedPath: transcriptPath, structuredPath },
  };
}

function packetTimestamp(context) {
  return context.episode.transcript.validatedAt || context.episode.updatedAt || context.ledger.updatedAt
    || fs.statSync(context.transcriptPath).mtime.toISOString();
}

function stageEpisode(options = {}) {
  const context = canonicalEpisode(options);
  const stagingRoot = path.resolve(options.stagingRoot || DEFAULT_STAGING_ROOT);
  if (stagingRoot === context.canonicalRoot) throw new Error('staging and canonical archive roots must be different');
  const stagingDir = path.join(stagingRoot, context.episode.publishedDate, context.episode.id);
  const staged = stagedEpisode(context, stagingDir);
  const packet = buildWorkPacket(canonicalizedEpisode(context), { now: packetTimestamp(context) });
  packet.transcript.path = staged.transcript.validatedPath;
  packet.transcript.structuredPath = staged.transcript.structuredPath;
  packet.outputs = outputPaths(staged);
  const stagingPacket = path.join(stagingDir, 'work_packet.json');
  const sources = [
    [context.transcriptPath, staged.transcript.validatedPath],
    [context.structuredPath, staged.transcript.structuredPath],
    ...SUPPORT_ARTIFACTS.map(name => [path.join(context.canonicalDir, name), path.join(stagingDir, name)]),
  ];
  const entries = sources.map(([source, destination]) => ({ destination, content: fs.readFileSync(source) }));
  entries.push({ destination: stagingPacket, content: packet });
  const counts = commitWrites(prepareWrites(entries, stagingRoot), stagingRoot);
  return {
    ok: true,
    episodeId: context.episode.id,
    stagingPacket,
    ...counts,
    validationMetrics: context.episode.transcript.validation,
  };
}

function readStagingPacket(context, stagingRoot) {
  const stagingDir = path.join(stagingRoot, context.episode.publishedDate, context.episode.id);
  const stagingPacket = path.join(stagingDir, 'work_packet.json');
  regularFile(stagingPacket, 'staging work packet');
  let packet;
  try { packet = JSON.parse(fs.readFileSync(stagingPacket, 'utf8')); }
  catch (error) { throw new Error(`staging work packet is invalid JSON: ${error.message}`); }
  const expected = buildWorkPacket(stagedEpisode(context, stagingDir), { now: packet.generatedAt });
  if (canonicalJson(packet) !== canonicalJson(expected)) {
    throw new Error(`staging work packet does not match canonical ledger episode: ${context.episode.id}`);
  }
  return { stagingDir, stagingPacket, packet };
}

function promoteEpisode(options = {}) {
  const context = canonicalEpisode(options);
  const stagingRoot = path.resolve(options.stagingRoot || DEFAULT_STAGING_ROOT);
  if (stagingRoot === context.canonicalRoot) throw new Error('staging and canonical archive roots must be different');
  const { stagingPacket, packet } = readStagingPacket(context, stagingRoot);
  const validation = validateAgentOutputs(packet);
  if (!validation.valid || validation.reasons.length !== 0) {
    const error = new Error(`agent output validation failed: ${validation.reasons.join(', ') || 'unknown validation failure'}`);
    error.validation = validation;
    throw error;
  }
  const canonicalPacketValue = buildWorkPacket(canonicalizedEpisode(context), { now: packet.generatedAt });
  const entries = [];
  for (const key of RELEASE_OUTPUTS) {
    const source = packet.outputs[key];
    const destination = canonicalPacketValue.outputs[key];
    let exists = false;
    try { exists = fs.lstatSync(source).isFile(); } catch (_) { /* handled below */ }
    if (!exists) {
      if (REQUIRED_RELEASE_OUTPUTS.includes(key)) throw new Error(`required staged release artifact is missing: ${source}`);
      continue;
    }
    entries.push({ destination, content: fs.readFileSync(source) });
  }
  const version = sha256(JSON.stringify(canonicalPacketValue)).slice(0, 12);
  const canonicalPacket = path.join(context.canonicalDir, `work_packet.${version}.json`);
  entries.push({ destination: canonicalPacket, content: canonicalPacketValue });
  const counts = commitWrites(prepareWrites(entries, context.canonicalRoot), context.canonicalRoot);
  return {
    ok: true,
    episodeId: context.episode.id,
    stagingPacket,
    canonicalPacket,
    ...counts,
    validation: { valid: validation.valid, reasons: validation.reasons, gateVersion: validation.gateVersion },
    validationMetrics: validation.metrics,
  };
}

module.exports = {
  DEFAULT_STAGING_ROOT,
  promoteEpisode,
  stageEpisode,
};
