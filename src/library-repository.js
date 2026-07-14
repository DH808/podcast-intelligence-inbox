'use strict';

const { verifyDatabase } = require('./library-database');

function jsonValue(value, fallback) {
  try { return value == null ? fallback : JSON.parse(value); } catch (_) { return fallback; }
}
function bounded(value, fallback, maximum = 100) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, maximum) : fallback;
}
function likeValue(value) { return `%${String(value || '').replace(/[\\%_]/g, '\\$&')}%`; }
function ftsValue(value) { return `"${String(value || '').replace(/"/g, '""')}"`; }

class LibraryRepository {
  constructor(db, options = {}) {
    this.db = db;
    this.publicMode = Boolean(options.publicMode);
  }

  episodeSummary(row) {
    const ready = Boolean(row.reader_ready);
    return {
      id: row.id,
      showId: row.show_id,
      show: row.show_name,
      showSlug: row.show_slug,
      title: row.canonical_title,
      publishedAt: row.published_at,
      publishedDate: row.published_date,
      durationSeconds: row.duration_seconds,
      duration: row.duration_text,
      description: row.description || '',
      originalUrl: row.original_url || '',
      audioUrl: this.publicMode ? '' : (row.audio_url || ''),
      mediaType: row.media_type,
      materiality: row.materiality,
      productionStatus: row.production_status,
      canonicalSourceType: row.canonical_source_type,
      readerReady: ready,
      publicReady: Boolean(row.public_ready),
      gateVersion: row.gate_version,
      blockReasons: jsonValue(row.block_reasons_json, []),
      transcriptReady: Boolean(row.transcript_ready),
      canonicalNoteAvailable: Boolean(row.canonical_note_available),
      qcReady: Boolean(row.qc_ready),
      noteChars: Number(row.note_chars || 0),
      whyItMatters: row.why_it_matters || row.description || '',
      detailUrl: ready ? `/api/episodes/${encodeURIComponent(row.id)}` : null,
    };
  }

  baseSql(where = '1=1') {
    return `SELECT e.*,s.canonical_name AS show_name,s.slug AS show_slug,
      EXISTS(SELECT 1 FROM artifacts a WHERE a.episode_id=e.id AND a.artifact_type IN ('transcript_txt','transcript_json')) AS transcript_ready,
      EXISTS(SELECT 1 FROM note_versions n WHERE n.episode_id=e.id AND n.canonical=1) AS canonical_note_available,
      EXISTS(SELECT 1 FROM qc_runs q JOIN note_versions n ON n.artifact_id=q.artifact_id WHERE n.episode_id=e.id AND n.canonical=1 AND q.passed=1) AS qc_ready,
      COALESCE((SELECT n.char_count FROM note_versions n WHERE n.episode_id=e.id AND n.canonical=1),0) AS note_chars,
      COALESCE((SELECT n.why_it_matters FROM note_versions n WHERE n.episode_id=e.id AND n.canonical=1),'') AS why_it_matters
      FROM episodes e JOIN shows s ON s.id=e.show_id WHERE ${where}`;
  }

  library(options = {}) {
    const limit = bounded(options.limit, 50, 100);
    const offset = bounded(options.offset, 0, 1_000_000);
    const clauses = ['e.reader_ready=1']; const params = [];
    if (options.showId) { clauses.push('e.show_id=?'); params.push(options.showId); }
    if (options.month) { clauses.push("substr(e.published_date,1,7)=?"); params.push(options.month); }
    if (options.theme) { clauses.push('EXISTS(SELECT 1 FROM episode_themes et JOIN themes t ON t.id=et.theme_id WHERE et.episode_id=e.id AND t.normalized_name=?)'); params.push(String(options.theme).toLocaleLowerCase()); }
    if (options.entity) { clauses.push('EXISTS(SELECT 1 FROM episode_entities ee JOIN entities x ON x.id=ee.entity_id WHERE ee.episode_id=e.id AND (x.id=? OR x.normalized_name=?))'); params.push(options.entity, String(options.entity).toLocaleLowerCase()); }
    if (options.q) {
      clauses.push(`(EXISTS(SELECT 1 FROM episode_search f WHERE f.episode_id=e.id AND episode_search MATCH ?) OR EXISTS(SELECT 1 FROM episode_search f WHERE f.episode_id=e.id AND
        (f.canonical_title LIKE ? ESCAPE '\\' OR f.show_name LIKE ? ESCAPE '\\' OR f.description LIKE ? ESCAPE '\\' OR f.canonical_note LIKE ? ESCAPE '\\' OR f.entities LIKE ? ESCAPE '\\' OR f.themes LIKE ? ESCAPE '\\' OR f.claims LIKE ? ESCAPE '\\')))`);
      const q = likeValue(options.q); params.push(ftsValue(options.q), q, q, q, q, q, q, q);
    }
    const where = clauses.join(' AND ');
    const total = Number(this.db.prepare(`SELECT COUNT(*) AS count FROM episodes e WHERE ${where}`).get(...params).count);
    const rows = this.db.prepare(`${this.baseSql(where)} ORDER BY COALESCE(e.published_date,'') DESC,e.canonical_title LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return { total, limit, offset, episodes: rows.map(row => this.episodeSummary(row)) };
  }

  catalog(options = {}) {
    if (this.publicMode) return { error: 'not_available', aggregateOnly: true, total: Number(this.db.prepare('SELECT COUNT(*) AS count FROM episodes WHERE reader_ready=1').get().count) };
    const limit = bounded(options.limit, 50, 200);
    const offset = bounded(options.offset, 0, 1_000_000);
    const clauses = ['1=1']; const params = [];
    if (options.showId) { clauses.push('e.show_id=?'); params.push(options.showId); }
    if (options.status) { clauses.push('e.production_status=?'); params.push(options.status); }
    if (options.ready === 'true' || options.ready === true) clauses.push('e.reader_ready=1');
    if (options.ready === 'false' || options.ready === false) clauses.push('e.reader_ready=0');
    if (options.since) { clauses.push('e.published_date>=?'); params.push(options.since); }
    const where = clauses.join(' AND ');
    const total = Number(this.db.prepare(`SELECT COUNT(*) AS count FROM episodes e WHERE ${where}`).get(...params).count);
    const rows = this.db.prepare(`${this.baseSql(where)} ORDER BY COALESCE(e.published_date,'') DESC,e.canonical_title LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return { total, limit, offset, episodes: rows.map(row => this.episodeSummary(row)) };
  }

  coverage(options = {}) {
    const since = String(options.since || '2026-07-01');
    const showRows = this.db.prepare(`SELECT s.id,s.canonical_name AS show,s.slug,s.tier,s.active,
      COUNT(DISTINCT e.id) FILTER (WHERE e.published_date>=? AND e.canonical_source_type='official_rss') AS official_episodes,
      COUNT(DISTINCT e.id) FILTER (WHERE e.published_date>=? AND e.canonical_source_type='official_rss' AND e.reader_ready=1) AS note_ready,
      COUNT(DISTINCT e.id) FILTER (WHERE e.published_date>=? AND e.canonical_source_type='official_rss' AND EXISTS(SELECT 1 FROM artifacts a WHERE a.episode_id=e.id AND a.artifact_type IN ('transcript_txt','transcript_json'))) AS transcript_ready,
      COUNT(DISTINCT e.id) FILTER (WHERE e.published_date>=? AND e.canonical_source_type='official_rss' AND EXISTS(SELECT 1 FROM qc_runs q WHERE q.episode_id=e.id AND q.passed=1)) AS qc_ready,
      COUNT(DISTINCT e.id) FILTER (WHERE e.published_date>=? AND e.canonical_source_type='official_rss' AND e.reader_ready=0) AS queued,
      COUNT(DISTINCT x.id) FILTER (WHERE e.published_date>=? AND e.canonical_source_type='official_rss' AND x.id_type IN ('candidate_id','youtube_id')) AS candidate_aliases_merged
      FROM shows s LEFT JOIN episodes e ON e.show_id=s.id LEFT JOIN episode_external_ids x ON x.episode_id=e.id
      GROUP BY s.id ORDER BY s.canonical_name`).all(since, since, since, since, since, since).map(row => ({
        id: row.id, show: row.show, slug: row.slug, tier: row.tier, active: Boolean(row.active),
        officialEpisodes: Number(row.official_episodes), noteReady: Number(row.note_ready), transcriptReady: Number(row.transcript_ready),
        qcReady: Number(row.qc_ready), queued: Number(row.queued), candidateAliasesMerged: Number(row.candidate_aliases_merged),
      }));
    const monthRows = this.db.prepare(`SELECT substr(published_date,1,7) AS month,
      COUNT(*) FILTER (WHERE canonical_source_type='official_rss') AS official_episodes,
      COUNT(*) FILTER (WHERE canonical_source_type='official_rss' AND reader_ready=1) AS note_ready,
      COUNT(*) FILTER (WHERE canonical_source_type='official_rss' AND reader_ready=0) AS queued
      FROM episodes WHERE published_date>=? GROUP BY month ORDER BY month`).all(since).map(row => ({ month: row.month,
        officialEpisodes: Number(row.official_episodes), noteReady: Number(row.note_ready), queued: Number(row.queued) }));
    return { since, totals: showRows.reduce((sum, row) => ({
      officialEpisodes: sum.officialEpisodes + row.officialEpisodes,
      noteReady: sum.noteReady + row.noteReady,
      transcriptReady: sum.transcriptReady + row.transcriptReady,
      qcReady: sum.qcReady + row.qcReady,
      queued: sum.queued + row.queued,
      candidateAliasesMerged: sum.candidateAliasesMerged + row.candidateAliasesMerged,
    }), { officialEpisodes: 0, noteReady: 0, transcriptReady: 0, qcReady: 0, queued: 0, candidateAliasesMerged: 0 }), shows: showRows, months: monthRows };
  }

  queue(options = {}) {
    if (this.publicMode) return { error: 'not_available', aggregateOnly: true, queued: Number(this.db.prepare('SELECT COUNT(*) AS count FROM production_queue').get().count) };
    const limit = bounded(options.limit, 100, 500); const offset = bounded(options.offset, 0, 1_000_000);
    const total = Number(this.db.prepare('SELECT COUNT(*) AS count FROM production_queue').get().count);
    const queueRows = this.db.prepare(`SELECT p.*,e.canonical_title,e.published_date,e.show_id,s.canonical_name AS show_name
      FROM production_queue p JOIN episodes e ON e.id=p.episode_id JOIN shows s ON s.id=e.show_id
      ORDER BY p.priority DESC,COALESCE(e.published_date,'') DESC LIMIT ? OFFSET ?`).all(limit, offset);
    return { total, limit, offset, episodes: queueRows.map(row => ({ id: row.episode_id, title: row.canonical_title, showId: row.show_id,
      show: row.show_name, publishedDate: row.published_date, priority: row.priority, status: row.status,
      missingTranscript: Boolean(row.missing_transcript), missingNote: Boolean(row.missing_note), missingQc: Boolean(row.missing_qc),
      missingMetadata: Boolean(row.missing_metadata), reasonCodes: jsonValue(row.reason_codes_json, []), nextAction: row.next_action,
      detailUrl: null })) };
  }

  show(id) {
    const show = this.db.prepare('SELECT * FROM shows WHERE id=? OR slug=?').get(id, id);
    if (!show) return null;
    const readyNotes = this.library({ showId: show.id, limit: 100, offset: 0 });
    const catalog = this.publicMode ? readyNotes : this.catalog({ showId: show.id, limit: 200, offset: 0 });
    const aliases = this.db.prepare('SELECT alias,source_type AS sourceType,confidence FROM show_aliases WHERE show_id=? ORDER BY confidence DESC,alias').all(show.id);
    return { id: show.id, name: show.canonical_name, slug: show.slug, tier: show.tier, publisher: show.publisher || '',
      officialFeedUrl: show.official_feed_url || '', officialPageUrl: show.official_page_url || '', active: Boolean(show.active), aliases,
      readyNotes: readyNotes.episodes, catalog: catalog.episodes || readyNotes.episodes,
      counts: { ready: readyNotes.total, catalog: catalog.total ?? readyNotes.total } };
  }

  episode(id) {
    const row = this.db.prepare(this.baseSql('e.id=? AND e.reader_ready=1')).get(id);
    if (!row) return null;
    const note = this.db.prepare('SELECT * FROM note_versions WHERE episode_id=? AND canonical=1').get(id);
    const themes = this.db.prepare('SELECT t.id,t.name,et.provenance FROM episode_themes et JOIN themes t ON t.id=et.theme_id WHERE et.episode_id=? ORDER BY t.name').all(id);
    const entities = this.db.prepare('SELECT x.id,x.entity_type AS type,x.canonical_name AS name,ee.evidence_source AS evidenceSource,ee.confidence FROM episode_entities ee JOIN entities x ON x.id=ee.entity_id WHERE ee.episode_id=? ORDER BY x.canonical_name').all(id);
    const artifacts = this.db.prepare(`SELECT id,artifact_type AS type,safe_download_name AS safeDownloadName,bytes,mime_type AS mimeType,source_layer AS sourceLayer,canonical,privacy_class AS privacyClass
      FROM artifacts WHERE episode_id=? ORDER BY canonical DESC,artifact_type`).all(id).filter(artifact => !this.publicMode || ['note_md','docx','pdf'].includes(artifact.type));
    const noteVersions = this.db.prepare(`SELECT n.id,n.version_label AS versionLabel,n.writing_style AS writingStyle,n.char_count AS charCount,n.language,n.source_boundary AS sourceBoundary,
      n.why_it_matters AS whyItMatters,n.canonical,n.superseded,n.imported_at AS importedAt,a.safe_download_name AS safeDownloadName
      FROM note_versions n JOIN artifacts a ON a.id=n.artifact_id WHERE n.episode_id=? ORDER BY n.canonical DESC,n.imported_at DESC`).all(id).map(version => ({ ...version, canonical: Boolean(version.canonical), superseded: Boolean(version.superseded) }));
    const claims = this.publicMode ? [] : this.db.prepare(`SELECT timestamp,speaker,claim,implication,evidence_label AS evidenceLabel,current_weight AS currentWeight,
      verification_needed AS verificationNeeded FROM claims WHERE episode_id=? ORDER BY id LIMIT 500`).all(id).map(claim => ({ ...claim, verificationNeeded: Boolean(claim.verificationNeeded) }));
    return { ...this.episodeSummary(row), noteMarkdown: note.note_text, sourceBoundary: note.source_boundary,
      whyItMatters: note.why_it_matters, noteVersions, themes, entities, artifacts: artifacts.map(artifact => ({ ...artifact,
        canonical: Boolean(artifact.canonical), downloadUrl: `/api/episodes/${encodeURIComponent(id)}/files/${encodeURIComponent(artifact.id)}` })), claims };
  }

  search(query, options = {}) {
    const q = String(query || '').trim();
    if (!q) return { query: '', total: 0, episodes: [] };
    const internal = !this.publicMode && Boolean(options.internal);
    const limit = bounded(options.limit, 20, 100);
    const pattern = likeValue(q);
    const ready = internal ? '1=1' : 'e.reader_ready=1';
    const sql = `${this.baseSql(`${ready} AND (EXISTS(SELECT 1 FROM episode_search f WHERE f.episode_id=e.id AND episode_search MATCH ?) OR EXISTS(SELECT 1 FROM episode_search f WHERE f.episode_id=e.id AND
      (f.canonical_title LIKE ? ESCAPE '\\' OR f.show_name LIKE ? ESCAPE '\\' OR f.description LIKE ? ESCAPE '\\' OR f.canonical_note LIKE ? ESCAPE '\\' OR f.entities LIKE ? ESCAPE '\\' OR f.themes LIKE ? ESCAPE '\\' OR f.claims LIKE ? ESCAPE '\\')))`)} ORDER BY e.reader_ready DESC,COALESCE(e.published_date,'') DESC LIMIT ?`;
    const rows = this.db.prepare(sql).all(ftsValue(q), pattern, pattern, pattern, pattern, pattern, pattern, pattern, limit);
    return { query: q, total: rows.length, internal, episodes: rows.map(row => this.episodeSummary(row)) };
  }

  audit() {
    const verification = verifyDatabase(this.db);
    const counts = this.db.prepare(`SELECT COUNT(*) AS total,COUNT(*) FILTER (WHERE reader_ready=1) AS ready,
      COUNT(*) FILTER (WHERE reader_ready=0) AS blocked,COUNT(*) FILTER (WHERE public_ready=1) AS public_ready FROM episodes`).get();
    const reasonCounts = {};
    for (const row of this.db.prepare('SELECT block_reasons_json FROM episodes WHERE reader_ready=0').all()) {
      for (const reason of jsonValue(row.block_reasons_json, [])) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
    const ingest = this.db.prepare(`SELECT id,started_at AS startedAt,completed_at AS completedAt,status,source_counts AS sourceCounts,
      inserted,updated,deduped,warnings,error_summary AS errorSummary,code_version AS codeVersion FROM ingest_runs ORDER BY started_at DESC LIMIT 1`).get();
    if (ingest) ingest.sourceCounts = jsonValue(ingest.sourceCounts, {});
    return { gateVersion: this.db.prepare('SELECT gate_version FROM episodes ORDER BY last_seen_at DESC LIMIT 1').get()?.gate_version || 'library-ready-v2',
      integrity: verification.integrity, ok: verification.ok, foreignKeyViolations: verification.foreignKeyViolations.length,
      duplicates: verification.duplicateIdentities.length + verification.duplicateCanonicalEpisodes.length,
      orphans: Object.values(verification.orphans).reduce((sum, value) => sum + value.length, 0),
      total: Number(counts.total), ready: Number(counts.ready), blocked: Number(counts.blocked), publicReady: Number(counts.public_ready),
      reasonCounts: Object.fromEntries(Object.entries(reasonCounts).sort()), ingest };
  }

  state() {
    const library = this.library({ limit: 100, offset: 0 });
    const coverage = this.coverage();
    const shows = this.db.prepare(`SELECT s.id,s.canonical_name AS name,s.slug,s.tier,
      COUNT(e.id) AS catalog_count,COUNT(e.id) FILTER (WHERE e.reader_ready=1) AS ready_count
      FROM shows s LEFT JOIN episodes e ON e.show_id=s.id GROUP BY s.id ORDER BY s.canonical_name`).all().map(row => ({
        id: row.id, name: row.name, slug: row.slug, tier: row.tier, catalogCount: Number(row.catalog_count), readyCount: Number(row.ready_count) }));
    return { generatedAt: new Date().toISOString(), episodes: library.episodes, libraryTotal: library.total, shows, coverage, audit: this.audit(), privateMode: !this.publicMode };
  }

  fileArtifact(episodeId, artifactId) {
    const row = this.db.prepare(`SELECT a.* FROM artifacts a JOIN episodes e ON e.id=a.episode_id
      WHERE a.id=? AND a.episode_id=? AND e.reader_ready=1`).get(artifactId, episodeId);
    if (!row) return null;
    if (this.publicMode && !['note_md','docx','pdf'].includes(row.artifact_type)) return null;
    return row;
  }
}

module.exports = { LibraryRepository, bounded };
