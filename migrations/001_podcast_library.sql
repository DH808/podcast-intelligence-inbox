CREATE TABLE ingest_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  source_roots TEXT NOT NULL,
  source_counts TEXT NOT NULL DEFAULT '{}',
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  deduped INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  code_version TEXT
) STRICT;

CREATE TABLE shows (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'standard',
  publisher TEXT,
  official_feed_url TEXT,
  apple_collection_id TEXT,
  official_page_url TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
) STRICT;

CREATE TABLE show_aliases (
  id INTEGER PRIMARY KEY,
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  UNIQUE(show_id, normalized_alias)
) STRICT;

CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE RESTRICT,
  canonical_title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  published_at TEXT,
  published_date TEXT,
  duration_seconds INTEGER,
  duration_text TEXT,
  description TEXT,
  original_url TEXT,
  audio_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'podcast',
  materiality TEXT NOT NULL DEFAULT 'unknown',
  production_status TEXT NOT NULL DEFAULT 'new',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  canonical_source_type TEXT NOT NULL,
  reader_ready INTEGER NOT NULL DEFAULT 0 CHECK (reader_ready IN (0,1)),
  public_ready INTEGER NOT NULL DEFAULT 0 CHECK (public_ready IN (0,1)),
  gate_version TEXT NOT NULL,
  block_reasons_json TEXT NOT NULL DEFAULT '[]'
) STRICT;

CREATE INDEX episodes_show_date_idx ON episodes(show_id, published_date DESC);
CREATE INDEX episodes_ready_date_idx ON episodes(reader_ready, published_date DESC);

CREATE TABLE episode_external_ids (
  id INTEGER PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL CHECK (id_type IN ('rss_guid','youtube_id','candidate_id','canonical_url','enclosure_url','episode_number')),
  id_value TEXT NOT NULL,
  source TEXT NOT NULL,
  UNIQUE(id_type, id_value),
  UNIQUE(episode_id, id_type, id_value)
) STRICT;

CREATE INDEX episode_external_episode_idx ON episode_external_ids(episode_id);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('note_md','docx','pdf','transcript_txt','transcript_json','audio','qc_json','claim_ledger_csv','claim_ledger_json','source_manifest','investment_extraction')),
  origin_path TEXT NOT NULL UNIQUE,
  safe_download_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  source_layer TEXT NOT NULL,
  created_at TEXT,
  mtime TEXT NOT NULL,
  canonical INTEGER NOT NULL DEFAULT 0 CHECK (canonical IN (0,1)),
  superseded_by TEXT REFERENCES artifacts(id) ON DELETE SET NULL,
  privacy_class TEXT NOT NULL CHECK (privacy_class IN ('reader','private','public-safe'))
) STRICT;

CREATE INDEX artifacts_episode_type_idx ON artifacts(episode_id, artifact_type);

CREATE TABLE note_versions (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL UNIQUE REFERENCES artifacts(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  writing_style TEXT NOT NULL,
  char_count INTEGER NOT NULL,
  language TEXT NOT NULL,
  source_boundary TEXT NOT NULL DEFAULT '',
  why_it_matters TEXT NOT NULL DEFAULT '',
  note_text TEXT NOT NULL DEFAULT '',
  canonical INTEGER NOT NULL DEFAULT 0 CHECK (canonical IN (0,1)),
  superseded INTEGER NOT NULL DEFAULT 0 CHECK (superseded IN (0,1)),
  imported_at TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX one_canonical_note_per_episode ON note_versions(episode_id) WHERE canonical = 1;

CREATE TABLE qc_runs (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  gate_version TEXT NOT NULL,
  passed INTEGER NOT NULL CHECK (passed IN (0,1)),
  reason_codes_json TEXT NOT NULL DEFAULT '[]',
  metrics_json TEXT NOT NULL DEFAULT '{}',
  qc_artifact_id TEXT REFERENCES artifacts(id) ON DELETE SET NULL,
  checked_at TEXT NOT NULL,
  checker_version TEXT NOT NULL,
  UNIQUE(artifact_id, gate_version, checker_version)
) STRICT;

CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE episode_themes (
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  provenance TEXT NOT NULL,
  PRIMARY KEY(episode_id, theme_id)
) WITHOUT ROWID, STRICT;

CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company','person','organization','asset')),
  canonical_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  UNIQUE(entity_type, normalized_name)
) STRICT;

CREATE TABLE episode_entities (
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  evidence_source TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  PRIMARY KEY(episode_id, entity_id)
) WITHOUT ROWID, STRICT;

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  timestamp TEXT,
  speaker TEXT,
  claim TEXT NOT NULL,
  implication TEXT,
  evidence_label TEXT,
  current_weight TEXT,
  verification_needed INTEGER NOT NULL DEFAULT 0 CHECK (verification_needed IN (0,1)),
  source_artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE production_queue (
  episode_id TEXT PRIMARY KEY REFERENCES episodes(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  missing_transcript INTEGER NOT NULL CHECK (missing_transcript IN (0,1)),
  missing_note INTEGER NOT NULL CHECK (missing_note IN (0,1)),
  missing_qc INTEGER NOT NULL CHECK (missing_qc IN (0,1)),
  missing_metadata INTEGER NOT NULL CHECK (missing_metadata IN (0,1)),
  reason_codes_json TEXT NOT NULL,
  next_action TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE VIRTUAL TABLE episode_search USING fts5(
  episode_id UNINDEXED,
  canonical_title,
  show_name,
  description,
  canonical_note,
  entities,
  themes,
  claims,
  tokenize = 'unicode61 remove_diacritics 2'
);
