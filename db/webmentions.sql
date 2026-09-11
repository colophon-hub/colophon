CREATE TABLE IF NOT EXISTS webmentions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  author_name TEXT NOT NULL DEFAULT '',
  author_url TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  source_title TEXT NOT NULL DEFAULT '',
  source_published TEXT NOT NULL DEFAULT '',
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, target)
);
CREATE INDEX IF NOT EXISTS idx_webmentions_target_state ON webmentions(target, state);
CREATE INDEX IF NOT EXISTS idx_webmentions_state ON webmentions(state);
CREATE TABLE IF NOT EXISTS webmention_outbound (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  endpoint TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  attempted_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, target)
);
CREATE INDEX IF NOT EXISTS idx_webmention_outbound_status ON webmention_outbound(status);
