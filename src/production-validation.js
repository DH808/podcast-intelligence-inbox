'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateLibraryReadiness, officialRssEpisodeSourceUrl, LIBRARY_GATE_VERSION } = require('./library-import');
const { sha256, writeAdditive } = require('./production-files');

const INTERNAL_PROCESS_TEXT = /(?:\bTODO\b|\bTBD\b|as an AI|language model|work[_ -]?packet|system prompt|internal (?:process|instruction)|请(?:模型|AI)生成|以下是(?:生成|改写)的|transcript (?:fetch|generation|acquisition) failed)/i;
const PLACEHOLDER_TEXT = /(?:^|\n)\s*(?:暂无|尚未|未提供|待补充|待完善|占位|placeholder|not available|n\/?a)(?:\s|[：:。.！!-]|$)/i;

function stripMarkdown(value) {
  return String(value || '').replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ').replace(/^#{1,6}\s*/gm, '').replace(/[|*_>~-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function cjkEquivalent(value) {
  const plain = stripMarkdown(value);
  const cjk = (plain.match(/[\u3400-\u9fff]/g) || []).length;
  const latinWords = (plain.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return { equivalent: cjk + Math.ceil(latinWords * 0.5), cjk, latinWords, strippedChars: plain.length };
}

function writingContract(episode = {}) {
  const title = String(episode.title || '');
  const duration = Number(episode.durationSeconds || 0);
  let writingClass;
  if (duration > 0 && duration <= 1_500) writingClass = 'short_news';
  else if (/(?:roundup|daily|week in|markets?|news|highlights|recap|special edition)/i.test(title)) writingClass = 'news_roundup';
  else if (duration >= 3_600 && /(?:founder|investor|interview|with\b|ceo|cto|president|professor)/i.test(title)) writingClass = 'longform_interview';
  else if (/(?:architecture|technical|engineering|infrastructure|semiconductor|chips?|compute|foundation model|blockchain|system|research)/i.test(title)) writingClass = 'technical_talk';
  else if (duration >= 2_700) writingClass = 'longform_interview';
  else writingClass = 'news_roundup';
  const contracts = {
    longform_interview: { minimumCjkEquivalent: 5_000, minimumSubstantiveSections: 8,
      requiredStructure: ['source_boundary', 'guest_context', 'one_sentence_thesis', 'episode_map', 'source_faithful_body', 'investment_implications', 'verification_queue'] },
    technical_talk: { minimumCjkEquivalent: 3_500, minimumSubstantiveSections: 7,
      requiredStructure: ['source_boundary', 'context', 'thesis', 'conceptual_progression', 'architecture_and_mechanism', 'examples', 'limitations', 'verification_queue'] },
    news_roundup: { minimumCjkEquivalent: 2_000, minimumSubstantiveSections: 5,
      requiredStructure: ['source_boundary', 'thesis', 'every_substantive_topic', 'fact_vs_interpretation', 'why_it_matters', 'verification_queue'] },
    short_news: { minimumCjkEquivalent: 1_200, minimumSubstantiveSections: 3,
      requiredStructure: ['source_boundary', 'all_material_facts', 'attribution_and_context', 'caveats', 'why_it_matters'] },
  };
  return { writingClass, ...contracts[writingClass] };
}

function outputPaths(episode) {
  const root = path.resolve(episode.artifactDir);
  return {
    noteMarkdown: path.join(root, 'notes_cn_source_faithful.md'),
    noteDocx: path.join(root, 'notes_cn_source_faithful.docx'),
    qcJson: path.join(root, 'notes_cn_source_faithful.qc.json'),
    investmentExtraction: path.join(root, 'investment_extraction.json'),
    claimLedger: path.join(root, 'claim_ledger.json'),
  };
}

function buildWorkPacket(episode, options = {}) {
  if (!episode?.transcript || episode.transcript.state !== 'validated' || !episode.transcript.validation?.valid) {
    throw new Error(`cannot build work packet without a validated transcript: ${episode?.id || '(missing id)'}`);
  }
  const transcriptPath = path.resolve(episode.transcript.validatedPath || '');
  if (!fs.existsSync(transcriptPath) || !fs.statSync(transcriptPath).isFile()) throw new Error(`validated transcript is missing: ${transcriptPath}`);
  const transcriptBytes = fs.readFileSync(transcriptPath);
  const expectedHash = episode.transcript.validation.sha256;
  const actualHash = sha256(transcriptBytes);
  if (expectedHash && actualHash !== expectedHash) throw new Error(`validated transcript hash mismatch: ${episode.id}`);
  const contract = writingContract(episode);
  const originalUrl = officialRssEpisodeSourceUrl(episode);
  return {
    format: 'podcast-note-work-packet-v1',
    generatedAt: options.now || episode.transcript.validatedAt || episode.updatedAt || new Date().toISOString(),
    episode: {
      id: episode.id, showId: episode.showId || null, show: episode.show, title: episode.title,
      publishedAt: episode.publishedAt || episode.publishedDate, publishedDate: episode.publishedDate,
      durationSeconds: episode.durationSeconds, description: episode.description || '', originalUrl,
      audioUrl: episode.audioUrl || '', tier: episode.tier || 'standard', materiality: episode.materiality || 'unknown',
    },
    transcript: {
      path: transcriptPath,
      structuredPath: episode.transcript.structuredPath || null,
      source: episode.transcript.source,
      sourceLabel: episode.transcript.sourceLabel || episode.transcript.source,
      sourceBoundary: episode.transcript.sourceBoundary || 'Validated transcript only; no claims may exceed the transcript and official metadata boundary.',
      bytes: transcriptBytes.length,
      sha256: actualHash,
      durationSeconds: episode.durationSeconds,
      language: episode.transcript.validation.language,
      validation: episode.transcript.validation,
    },
    writing: {
      class: contract.writingClass,
      minimumCjkEquivalent: contract.minimumCjkEquivalent,
      minimumSubstantiveSections: contract.minimumSubstantiveSections,
      requiredStructure: contract.requiredStructure,
      preserve: ['speaker attribution', 'discussion order', 'mechanisms', 'examples', 'numbers', 'caveats', 'comparisons', 'timestamp anchors where present'],
    },
    quality: {
      gateVersion: LIBRARY_GATE_VERSION,
      qcMustPass: true,
      noteMustRemainBlockedUntilValidated: true,
      separateInvestmentInterpretation: true,
    },
    outputs: outputPaths(episode),
    constraints: {
      noHallucination: true,
      sourceFaithfulOnly: true,
      neverInventMissingFacts: true,
      neverPadToThreshold: true,
      discloseTranscriptLimitations: true,
      doNotIncludePromptsOrInternalProcess: true,
      identityMustMatchEpisodeId: episode.id,
    },
  };
}

function generateWorkPacket(episode, options = {}) {
  const packet = buildWorkPacket(episode, options);
  const root = path.resolve(episode.artifactDir);
  const target = path.join(root, 'work_packet.json');
  try {
    return writeAdditive(target, packet, { root }).path;
  } catch (error) {
    if (!/refusing to overwrite existing production artifact/i.test(error.message)) throw error;
    // A packet may be handed off from private staging to the canonical archive.
    // Its output paths then legitimately change. Preserve the old immutable packet
    // and create a content-addressed successor instead of overwriting it.
    const version = sha256(JSON.stringify(packet)).slice(0, 12);
    return writeAdditive(path.join(root, `work_packet.${version}.json`), packet, { root }).path;
  }
}

function section(markdown, patterns) {
  const lines = String(markdown || '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#{1,6})\s+(.+)$/);
    if (!heading || !patterns.some(pattern => pattern.test(heading[2]))) continue;
    const level = heading[1].length; const content = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const next = lines[cursor].match(/^(#{1,6})\s+(.+)$/);
      if (next && next[1].length <= level) break;
      content.push(lines[cursor]);
    }
    return stripMarkdown(content.join('\n'));
  }
  return '';
}

function validateAgentOutputs(packet, options = {}) {
  const reasons = []; const metrics = {};
  if (!packet || packet.format !== 'podcast-note-work-packet-v1') return { valid: false, reasons: ['work_packet_invalid'], metrics };
  const transcriptPath = packet.transcript?.path;
  let transcriptHash = '';
  if (!packet.transcript?.validation?.valid) reasons.push('transcript_unvalidated');
  if (!transcriptPath || !fs.existsSync(transcriptPath)) reasons.push('transcript_missing');
  else {
    transcriptHash = sha256(fs.readFileSync(transcriptPath));
    if (transcriptHash !== packet.transcript.sha256) reasons.push('transcript_hash_mismatch');
  }
  const notePath = packet.outputs?.noteMarkdown;
  let note = '';
  if (!notePath || !fs.existsSync(notePath)) reasons.push('note_missing');
  else {
    note = fs.readFileSync(notePath, 'utf8');
    const counts = cjkEquivalent(note); Object.assign(metrics, counts);
    if (counts.equivalent < Number(packet.writing.minimumCjkEquivalent || 0)) reasons.push('note_too_short_for_writing_class');
    if (counts.cjk < 80) reasons.push('note_not_substantive_chinese');
    if (PLACEHOLDER_TEXT.test(note.slice(0, 4_000))) reasons.push('note_placeholder');
    if (INTERNAL_PROCESS_TEXT.test(note)) reasons.push('internal_process_text_leaked');
    if (!new RegExp(`(?:Episode\\s*ID|episode_id)\\s*[：:]\\s*${String(packet.episode.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(note)) reasons.push('episode_identity_mismatch');
    const normalizedHeading = stripMarkdown((note.match(/^#\s+(.+)$/m) || [])[1] || '').toLocaleLowerCase();
    const titleSignal = String(packet.episode.title || '').split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 5)
      .some(token => normalizedHeading.includes(token.toLocaleLowerCase()));
    if (!titleSignal || !normalizedHeading.includes(String(packet.episode.show || '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)[0]?.toLocaleLowerCase() || '')) {
      reasons.push('episode_title_or_show_mismatch');
    }
  }
  const sourceBoundaryText = section(note, [/source\s*boundary/i, /来源边界/i, /写作边界/i]);
  const whyText = section(note, [/为什么.*(?:重要|值得|研究)/i, /why\s+it\s+matters/i, /一句话.*(?:thesis|结论|定位)/i]);
  metrics.sourceBoundaryChars = sourceBoundaryText.length;
  metrics.whyItMattersChars = whyText.length;
  const headings = [...note.matchAll(/^#{2,4}\s+(.+)$/gm)].map(match => match[1]);
  const substantiveSections = headings.filter(heading => section(note,
    [new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')]).length >= 40).length;
  metrics.substantiveSections = substantiveSections;
  if (sourceBoundaryText.length < 12) reasons.push('source_boundary_missing');
  else if (!/(?:逐字稿|转写|字幕|transcript|ASR|官方页面)/i.test(sourceBoundaryText)) reasons.push('source_boundary_incomplete');
  if (whyText.length < 40) reasons.push('why_it_matters_missing');
  if (substantiveSections < Number(packet.writing.minimumSubstantiveSections || 0)) reasons.push('insufficient_substantive_sections');

  const qcPath = packet.outputs?.qcJson; let qc = null;
  if (!qcPath || !fs.existsSync(qcPath)) reasons.push('qc_missing');
  else {
    try { qc = JSON.parse(fs.readFileSync(qcPath, 'utf8')); } catch (_) { reasons.push('qc_invalid_json'); }
  }
  if (qc) {
    if (qc.passed !== true || /(?:fail|error|invalid|reject)/i.test(String(qc.status || ''))) reasons.push('qc_failed');
    if ((qc.gate_version || qc.gateVersion) !== LIBRARY_GATE_VERSION) reasons.push('qc_gate_version_mismatch');
    if ((qc.episode_id || qc.episodeId) !== packet.episode.id || qc.title !== packet.episode.title || qc.show !== packet.episode.show) reasons.push('qc_episode_identity_mismatch');
    if (qc.source_transcript_sha256 !== transcriptHash) reasons.push('qc_transcript_hash_mismatch');
    if (!qc.checks || !qc.checks.source_boundary || !qc.checks.why_it_matters || !qc.checks.identity) reasons.push('qc_required_checks_missing');
  }
  if (notePath && fs.existsSync(notePath)) {
    const readiness = evaluateLibraryReadiness({
      title: packet.episode.title, show: packet.episode.show, publishedDate: packet.episode.publishedDate,
      originalUrl: packet.episode.originalUrl, noteText: note, notePath, expectedSha256: sha256(fs.readFileSync(notePath)),
      sourceBoundary: sourceBoundaryText, whyItMatters: whyText, canonical: true,
      deterministicQcPassed: Boolean(qc?.passed && (qc.gate_version || qc.gateVersion) === LIBRARY_GATE_VERSION),
    });
    if (!readiness.ready) reasons.push(...readiness.reasons.map(reason => `library_ready_v2:${reason}`));
  }
  const unique = [...new Set(reasons)].sort();
  if (options.throwOnError && unique.length) throw new Error(`agent output validation failed: ${unique.join(', ')}`);
  return { valid: unique.length === 0, reasons: unique, metrics, gateVersion: LIBRARY_GATE_VERSION };
}

module.exports = { buildWorkPacket, cjkEquivalent, generateWorkPacket, outputPaths, validateAgentOutputs, writingContract };
