'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { copyAdditive, sha256, sha256File, writeAdditive } = require('./production-files');
const { sourceBoundary } = require('./production-ledger');

const APP_DIR = path.resolve(__dirname, '..');
const ACQUISITION_ORDER = Object.freeze([
  'attached_transcript',
  'official_page',
  'youtube_transcript_api',
  'yt_dlp_captions',
  'third_party_youtube_subtitle',
  'official_rss_audio_asr',
]);
const ERROR_BODY = /(?:<!doctype\s+html|<html\b|bad gateway|access denied|forbidden|not found|rate limit|service unavailable|cloudflare|captcha)/i;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36 PodcastRadar/1.0';

function timestampSeconds(value) {
  const parts = String(value || '').replace(',', '.').split(':').map(Number);
  if (parts.length < 2 || parts.some(number => !Number.isFinite(number))) return null;
  return parts.reduce((total, number) => total * 60 + number, 0);
}
function timestamp(value) {
  const seconds = Math.max(0, Number(value || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = (seconds % 60).toFixed(1).padStart(4, '0');
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${remainder}`;
}
function stripMarkup(value) {
  return String(value || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
function transcriptSegments(text) {
  const lines = String(text || '').split(/\r?\n/);
  const segments = [];
  for (const line of lines) {
    const match = line.match(/^\s*\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d+)?)\]?\s*(?:--?>\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d+)?)\s*)?(.*)$/);
    if (!match) continue;
    const start = timestampSeconds(match[1]);
    const end = timestampSeconds(match[2]);
    const segmentText = stripMarkup(match[3]);
    if (start != null && segmentText) segments.push({ start, end: end == null ? null : end, text: segmentText });
  }
  return segments;
}

function validateTranscript(input = {}) {
  const rawText = String(input.text || '').replace(/\u0000/g, '');
  const text = rawText.trim();
  const durationSeconds = Math.max(0, Number(input.durationSeconds || 0));
  const plain = stripMarkup(text).replace(/\s+/g, ' ').trim();
  const nonWhitespaceChars = plain.replace(/\s/g, '').length;
  const wordCount = (plain.match(/[\p{L}\p{N}]+/gu) || []).length;
  const cjkChars = (plain.match(/[\u3400-\u9fff]/g) || []).length;
  const minimumChars = Math.max(1_000, Math.ceil(durationSeconds * 1.5));
  const reasons = [];
  if (!text) reasons.push('transcript_empty');
  if (ERROR_BODY.test(text.slice(0, 4_000))) reasons.push('transcript_http_error_body');
  if (nonWhitespaceChars < minimumChars) reasons.push('transcript_too_short_for_duration');
  if (wordCount < 120 && cjkChars < 500) reasons.push('transcript_not_substantive');
  if (durationSeconds >= 300 && wordCount < durationSeconds * 0.65 && cjkChars < durationSeconds) {
    reasons.push('transcript_word_coverage_incomplete');
  }
  const segments = Array.isArray(input.segments) && input.segments.length ? input.segments : transcriptSegments(text);
  const uniqueTimestamps = [...new Set(segments.map(segment => Number(segment.start).toFixed(1)))];
  const maximumTimestamp = segments.reduce((maximum, segment) => Math.max(maximum, Number(segment.end ?? segment.start ?? 0)), 0);
  if (durationSeconds >= 300 && uniqueTimestamps.length >= 3 && maximumTimestamp < durationSeconds * 0.75) reasons.push('transcript_timestamp_coverage_incomplete');
  const language = cjkChars >= nonWhitespaceChars * 0.35 ? (wordCount > 100 ? 'mixed' : 'zh') : 'en';
  return {
    valid: reasons.length === 0,
    reasons,
    source: input.source || 'unknown',
    bytes: Buffer.byteLength(text),
    sha256: sha256(rawText),
    nonWhitespaceChars,
    wordCount,
    cjkChars,
    durationSeconds,
    minimumChars,
    language,
    timestamped: segments.length > 0,
    segmentCount: segments.length,
    maximumTimestamp,
  };
}

function validateAudioMetadata(input = {}) {
  const contentType = String(input.contentType || '').split(';')[0].trim().toLowerCase();
  const bytes = Number(input.bytes || 0);
  const prefix = Buffer.isBuffer(input.prefix) ? input.prefix : Buffer.from(input.prefix || '');
  const prefixText = prefix.subarray(0, 1_024).toString('utf8');
  const magic = prefix.subarray(0, 12);
  const recognizedMagic = magic.subarray(0, 3).toString('ascii') === 'ID3'
    || (magic[0] === 0xff && (magic[1] & 0xe0) === 0xe0)
    || magic.subarray(4, 8).toString('ascii') === 'ftyp'
    || magic.subarray(0, 4).toString('ascii') === 'RIFF'
    || magic.subarray(0, 4).toString('ascii') === 'OggS';
  if (ERROR_BODY.test(prefixText) || /^\s*[<{]/.test(prefixText)) throw new Error('download body is not audio');
  if (!contentType.startsWith('audio/') && !(contentType === 'application/octet-stream' && recognizedMagic)) {
    throw new Error(`download content type is not audio: ${contentType || '(missing)'}`);
  }
  if (bytes < Number(input.minimumBytes || 100_000)) throw new Error(`audio download is too small: ${bytes} bytes`);
  if (!recognizedMagic) throw new Error('audio magic bytes are invalid');
  return { contentType, bytes, recognizedMagic };
}

function resultFromSegments(segments, source) {
  const clean = segments.map(segment => ({ start: Number(segment.start || 0), end: segment.end == null ? null : Number(segment.end),
    text: stripMarkup(segment.text) })).filter(segment => segment.text);
  return { source, segments: clean, text: clean.map(segment => `[${timestamp(segment.start)}] ${segment.text}`).join('\n') };
}

function vttResult(value, source) {
  const blocks = String(value || '').replace(/^WEBVTT[^\n]*\n/i, '').split(/\n\s*\n/);
  const segments = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter(Boolean);
    const timingIndex = lines.findIndex(line => /-->/.test(line));
    if (timingIndex < 0) continue;
    const match = lines[timingIndex].match(/((?:\d{2}:)?\d{2}:\d{2}[.,]\d+)\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d+)/);
    if (!match) continue;
    const text = stripMarkup(lines.slice(timingIndex + 1).join(' ')).replace(/<[^>]+>/g, '').trim();
    if (text && text !== segments.at(-1)?.text) segments.push({ start: timestampSeconds(match[1]), end: timestampSeconds(match[2]), text });
  }
  return resultFromSegments(segments, source);
}

function command(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, { encoding: options.encoding === null ? null : 'utf8', timeout: options.timeout,
    maxBuffer: options.maxBuffer || 16 * 1024 * 1024, env: options.env || process.env, cwd: options.cwd || APP_DIR });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${commandName} exited ${result.status}: ${String(result.stderr || '').trim().slice(0, 1_000)}`);
  return result;
}

function curlToFile(url, file, options = {}) {
  const writeOut = '%{content_type}\n%{size_download}\n%{url_effective}';
  const args = ['--location', '--fail', '--silent', '--show-error', '--max-time', String(options.seconds || 120),
    '--connect-timeout', String(options.connectSeconds || 15), '--max-redirs', '8', '--user-agent', options.userAgent || DEFAULT_USER_AGENT,
    '--header', 'Accept: text/html,application/xhtml+xml,application/json;q=0.9,audio/*;q=0.8,*/*;q=0.5',
    '--header', 'Accept-Language: en-US,en;q=0.8'];
  if (options.maximumBytes) args.push('--max-filesize', String(options.maximumBytes));
  args.push('--output', file, '--write-out', writeOut, url);
  const result = command(options.curlCommand || 'curl', args, { timeout: (Number(options.seconds || 120) + 5) * 1000 });
  const lines = String(result.stdout || '').trim().split(/\r?\n/);
  return { contentType: lines[0] || '', bytes: Number(lines[1] || fs.statSync(file).size), finalUrl: lines.slice(2).join('\n') || url };
}

function officialPageProvider(episode, options = {}) {
  if (!episode.originalUrl) return null;
  if (/(?:youtube\.com|youtu\.be)\//i.test(episode.originalUrl)) return null;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-page-'));
  const file = path.join(directory, 'page.html');
  try {
    const response = curlToFile(episode.originalUrl, file, { ...options, seconds: options.pageSeconds || 60 });
    if (response.bytes > Number(options.maximumPageBytes || 10 * 1024 * 1024)) throw new Error('official page exceeds bounded response size');
    const html = fs.readFileSync(file, 'utf8');
    if (ERROR_BODY.test(html.slice(0, 2_000))) throw new Error('official page returned an error body');
    const marker = /(?:full\s+transcript|episode\s+transcript|transcript|逐字稿)/ig;
    let match; let longest = '';
    while ((match = marker.exec(html))) {
      const candidate = stripMarkup(html.slice(match.index, Math.min(html.length, match.index + 2_000_000))
        .replace(/<\/(?:p|div|section|article|li|h[1-6])>/gi, '\n')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' '));
      if (candidate.length > longest.length) longest = candidate;
    }
    const requiredChars = Math.max(3_000, Number(episode.durationSeconds || 0) * 4);
    const lines = longest.split(/\n/).filter(line => line.trim().length >= 20);
    const transcriptSignals = (longest.match(/(?:^|\n)\s*(?:\[?\d{1,2}:\d{2}|[A-Z][A-Za-z .'-]{1,30}:)/gm) || []).length;
    return longest.replace(/\s/g, '').length >= requiredChars && (lines.length >= 20 || transcriptSignals >= 10)
      ? { text: longest, source: 'official_page', sourceUrl: response.finalUrl } : null;
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function youtubeTranscriptProvider(episode, options = {}) {
  const videoId = episode.youtubeIds?.[0];
  if (!videoId) return null;
  const script = path.join(APP_DIR, 'scripts', 'youtube-transcript.py');
  const result = command(options.pythonCommand || 'python3', [script, '--video-id', videoId], { timeout: Number(options.youtubeApiSeconds || 90) * 1000 });
  const parsed = JSON.parse(result.stdout);
  return resultFromSegments(parsed.segments || parsed, 'youtube_transcript_api');
}

function ytDlpProvider(episode, options = {}) {
  const videoId = episode.youtubeIds?.[0];
  if (!videoId) return null;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-ytdlp-'));
  try {
    const output = path.join(directory, '%(id)s.%(ext)s');
    command(options.ytDlpCommand || 'yt-dlp', ['--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', 'en.*,en,zh.*,zh-Hans,zh-Hant',
      '--sub-format', 'vtt', '--no-playlist', '--output', output, `https://www.youtube.com/watch?v=${videoId}`],
    { timeout: Number(options.ytDlpSeconds || 150) * 1000 });
    const subtitles = fs.readdirSync(directory).filter(name => /\.vtt$/i.test(name)).sort();
    return subtitles[0] ? vttResult(fs.readFileSync(path.join(directory, subtitles[0]), 'utf8'), 'yt_dlp_captions') : null;
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function thirdPartyProvider(episode, options = {}) {
  const videoId = episode.youtubeIds?.[0];
  if (!videoId || !options.thirdPartyTemplate) return null;
  const url = String(options.thirdPartyTemplate).replaceAll('{videoId}', encodeURIComponent(videoId));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-third-party-'));
  const file = path.join(directory, 'subtitle');
  try {
    curlToFile(url, file, { ...options, seconds: options.thirdPartySeconds || 60 });
    const value = fs.readFileSync(file, 'utf8');
    if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      const parsed = JSON.parse(value); const segments = parsed.segments || parsed.transcript || parsed;
      if (Array.isArray(segments)) return resultFromSegments(segments, 'third_party_youtube_subtitle');
    }
    return /WEBVTT|-->/.test(value) ? vttResult(value, 'third_party_youtube_subtitle')
      : { text: value, source: 'third_party_youtube_subtitle', sourceUrl: url };
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function attachedProvider(episode) {
  for (const candidate of episode.transcript?.candidates || []) {
    if (!fs.existsSync(candidate.path) || !fs.statSync(candidate.path).isFile()) continue;
    const value = fs.readFileSync(candidate.path);
    if (candidate.sha256 && sha256(value) !== candidate.sha256) continue;
    let text = value.toString('utf8'); let segments = [];
    if (candidate.type === 'transcript_json') {
      try {
        const parsed = JSON.parse(text); segments = parsed.segments || parsed.transcript || (Array.isArray(parsed) ? parsed : []);
        if (Array.isArray(segments) && segments.length) ({ text } = resultFromSegments(segments, 'attached_transcript'));
      } catch (_) { /* validation will reject malformed JSON text */ }
    }
    return { text, segments, source: 'attached_transcript', sourcePath: candidate.path };
  }
  return null;
}

function runAsrCommand(audioPath, outputDir, options = {}, offsetSeconds = 0, timeoutSeconds = 600) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'transcript.json');
  const textPath = path.join(outputDir, 'transcript.txt');
  const script = path.join(APP_DIR, 'scripts', 'faster-whisper-asr.py');
  const args = [script, '--audio', audioPath, '--json', jsonPath, '--text', textPath, '--model', options.asrModel || 'small',
    '--offset', String(offsetSeconds)];
  if (options.asrDevice) args.push('--device', options.asrDevice);
  command(options.pythonCommand || 'python3', args, { timeout: timeoutSeconds * 1000, maxBuffer: 2 * 1024 * 1024 });
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return resultFromSegments(parsed.segments || [], 'official_rss_audio_asr');
}

function runBoundedAsr(audioPath, episode, options = {}) {
  const duration = Number(episode.durationSeconds || 0);
  const maximumDuration = Number(options.maximumAsrDurationSeconds || 7_200);
  if (duration && duration > maximumDuration) throw new Error(`episode duration exceeds bounded ASR limit: ${duration}s > ${maximumDuration}s`);
  const budgetSeconds = Number(options.maximumAsrWallSeconds || 1_800);
  const deadline = Date.now() + budgetSeconds * 1000;
  const monolithicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-asr-full-'));
  try {
    try {
      return runAsrCommand(audioPath, monolithicDir, options, 0, Math.min(Number(options.monolithicAsrSeconds || 600), budgetSeconds));
    } catch (error) {
      const chunksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-asr-chunks-'));
      try {
        const outputPattern = path.join(chunksDir, 'chunk-%03d.mp3');
        command(options.ffmpegCommand || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', audioPath, '-f', 'segment', '-segment_time', '600',
          '-reset_timestamps', '1', '-codec:a', 'libmp3lame', '-q:a', '5', outputPattern], { timeout: Number(options.splitSeconds || 300) * 1000 });
        const chunks = fs.readdirSync(chunksDir).filter(name => /^chunk-\d+\.mp3$/.test(name)).sort();
        const maximumChunks = Math.min(12, Number(options.maximumAsrChunks || 12));
        if (!chunks.length || chunks.length > maximumChunks) throw new Error(`ASR recovery produced invalid chunk count: ${chunks.length}`);
        const allSegments = [];
        for (const [index, name] of chunks.entries()) {
          const remaining = Math.floor((deadline - Date.now()) / 1000);
          if (remaining < 30) throw new Error('bounded ASR wall-time budget exhausted during chunk recovery');
          const result = runAsrCommand(path.join(chunksDir, name), path.join(chunksDir, `out-${index}`), options, index * 600,
            Math.min(Number(options.chunkAsrSeconds || 300), remaining));
          allSegments.push(...result.segments);
        }
        return resultFromSegments(allSegments, 'official_rss_audio_asr');
      } finally { fs.rmSync(chunksDir, { recursive: true, force: true }); }
    }
  } finally { fs.rmSync(monolithicDir, { recursive: true, force: true }); }
}

function audioAsrProvider(episode, options = {}) {
  if (!episode.audioUrl) return null;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `podcast-audio-${episode.id}-`));
  const audioPath = path.join(directory, 'episode-audio');
  const lockPath = path.resolve(options.audioLockPath || path.join(APP_DIR, 'data', 'private', 'podcast_audio_asr.lock'));
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let lock;
  try {
    lock = fs.openSync(lockPath, 'wx', 0o600);
    const maximumBytes = Number(options.maximumAudioBytes || 500 * 1024 * 1024);
    const response = curlToFile(episode.audioUrl, audioPath, { ...options, maximumBytes, seconds: options.audioDownloadSeconds || 300 });
    const stat = fs.statSync(audioPath);
    if (stat.size > maximumBytes) throw new Error(`audio download exceeds bounded size: ${stat.size}`);
    const prefix = Buffer.alloc(Math.min(1_024, stat.size));
    const fd = fs.openSync(audioPath, 'r'); try { fs.readSync(fd, prefix, 0, prefix.length, 0); } finally { fs.closeSync(fd); }
    const audio = validateAudioMetadata({ contentType: response.contentType, bytes: stat.size, prefix });
    const result = runBoundedAsr(audioPath, episode, options);
    result.audio = { ...audio, finalUrl: response.finalUrl, sha256: sha256File(audioPath), temporaryPath: audioPath };
    if (options.keepAudio) {
      const extension = audio.contentType.includes('mp4') ? '.m4a' : audio.contentType.includes('wav') ? '.wav' : '.mp3';
      result.audio.keptPath = copyAdditive(audioPath, path.join(episode.artifactDir, `source_audio${extension}`), { root: episode.artifactDir }).path;
    }
    return result;
  } finally {
    try { if (lock != null) fs.closeSync(lock); } catch (_) { /* no-op */ }
    try { fs.unlinkSync(lockPath); } catch (_) { /* no-op */ }
    if (!options.keepAudio) fs.rmSync(directory, { recursive: true, force: true });
    else fs.rmSync(directory, { recursive: true, force: true });
  }
}

function defaultProviders(episode, options) {
  return {
    attached_transcript: () => attachedProvider(episode),
    official_page: () => officialPageProvider(episode, options),
    youtube_transcript_api: () => youtubeTranscriptProvider(episode, options),
    yt_dlp_captions: () => ytDlpProvider(episode, options),
    third_party_youtube_subtitle: () => thirdPartyProvider(episode, options),
    official_rss_audio_asr: () => audioAsrProvider(episode, options),
  };
}

function acquireTranscript(episode, options = {}) {
  const providers = { ...defaultProviders(episode, options), ...(options.providers || {}) };
  const attempts = [];
  for (const name of ACQUISITION_ORDER) {
    const provider = providers[name];
    if (typeof provider !== 'function') { attempts.push({ source: name, outcome: 'unavailable' }); continue; }
    try {
      const result = provider();
      if (!result) { attempts.push({ source: name, outcome: 'unavailable' }); continue; }
      const validation = validateTranscript({ ...result, durationSeconds: episode.durationSeconds, source: name });
      if (!validation.valid) { attempts.push({ source: name, outcome: 'invalid', reasons: validation.reasons, metrics: validation }); continue; }
      return { ...result, source: name, sourceLabel: name, sourceBoundary: sourceBoundary(name, result.sourcePath), validation, attempts };
    } catch (error) {
      attempts.push({ source: name, outcome: 'error', error: String(error.message || error).slice(0, 2_000) });
    }
  }
  const error = new Error('all bounded transcript acquisition sources failed');
  error.attempts = attempts;
  throw error;
}

function acquireAndStoreTranscript(episode, options = {}) {
  const acquired = acquireTranscript(episode, options);
  const artifactDir = path.resolve(episode.artifactDir);
  const segments = acquired.segments?.length ? acquired.segments : transcriptSegments(acquired.text);
  const structured = {
    format: 'podcast-transcript-v1', episode_id: episode.id, source: acquired.source, source_label: acquired.sourceLabel,
    source_boundary: acquired.sourceBoundary, language: acquired.validation.language, duration_seconds: episode.durationSeconds,
    transcript_sha256: acquired.validation.sha256, validation: acquired.validation, segments,
  };
  const textResult = writeAdditive(path.join(artifactDir, 'transcript_timestamped.txt'), String(acquired.text), { root: artifactDir });
  const jsonResult = writeAdditive(path.join(artifactDir, 'transcript_structured.json'), structured, { root: artifactDir });
  const metadata = {
    episode_id: episode.id, show: episode.show, title: episode.title, published: episode.publishedAt || episode.publishedDate,
    duration_sec: episode.durationSeconds, url: episode.originalUrl, audio_url: episode.audioUrl, youtube_ids: episode.youtubeIds || [],
    transcript_status: 'validated', transcript_source: acquired.source, source_boundary: acquired.sourceBoundary,
  };
  const manifest = {
    format: 'podcast-source-manifest-v1', episode_id: episode.id, generated_at: options.now || new Date().toISOString(),
    source: acquired.source, source_label: acquired.sourceLabel, source_boundary: acquired.sourceBoundary,
    official_url: episode.originalUrl, official_audio_url: episode.audioUrl, transcript: { path: textResult.path, bytes: textResult.bytes,
      sha256: textResult.sha256, structured_path: jsonResult.path, structured_sha256: jsonResult.sha256, validation: acquired.validation },
    attempts: acquired.attempts,
  };
  writeAdditive(path.join(artifactDir, 'metadata.json'), metadata, { root: artifactDir });
  writeAdditive(path.join(artifactDir, 'source_manifest.json'), manifest, { root: artifactDir });
  return { ...acquired, validatedPath: textResult.path, structuredPath: jsonResult.path, manifestPath: path.join(artifactDir, 'source_manifest.json') };
}

module.exports = {
  ACQUISITION_ORDER,
  acquireAndStoreTranscript,
  acquireTranscript,
  attachedProvider,
  resultFromSegments,
  runBoundedAsr,
  transcriptSegments,
  validateAudioMetadata,
  validateTranscript,
  vttResult,
};
