CREATE TABLE IF NOT EXISTS podcast_hosting_jobs (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  source_feed_url TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'queued',
  cursor INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  migrated INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_podcast_hosting_jobs_show ON podcast_hosting_jobs(show_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS podcast_downloads_daily (
  episode_id TEXT NOT NULL,
  day TEXT NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(episode_id, day)
);

CREATE TABLE IF NOT EXISTS podcast_distribution_jobs (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL,
  show_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  remote_id TEXT NOT NULL DEFAULT '',
  remote_url TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(episode_id, destination)
);
CREATE INDEX IF NOT EXISTS idx_podcast_distribution_state ON podcast_distribution_jobs(state, updated_at);
