CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  investigation_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'developing',
  publication_status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investigations_publication
  ON investigations(publication_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_status
  ON investigations(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS investigation_sources (
  id TEXT PRIMARY KEY,
  source_json TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investigation_timeline_events (
  id TEXT PRIMARY KEY,
  event_json TEXT NOT NULL,
  event_date TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records_requests (
  id TEXT PRIMARY KEY,
  request_json TEXT NOT NULL,
  agency TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Drafting',
  date_filed TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_relations (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'related',
  relation_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_relations_source
  ON content_relations(source_type, source_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_content_relations_target
  ON content_relations(target_type, target_id);

CREATE TABLE IF NOT EXISTS investigation_revisions (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  revision_json TEXT NOT NULL,
  revision_note TEXT NOT NULL DEFAULT 'save',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_investigation_revisions
  ON investigation_revisions(investigation_id, created_at DESC);
