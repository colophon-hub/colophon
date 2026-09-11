CREATE TABLE IF NOT EXISTS admin_user_security (
  user_id TEXT PRIMARY KEY,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  totp_secret_cipher TEXT,
  totp_secret_nonce TEXT,
  totp_pending_cipher TEXT,
  totp_pending_nonce TEXT,
  recovery_codes_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_user_passkeys (
  credential_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Passkey',
  public_key_spki TEXT NOT NULL,
  algorithm INTEGER NOT NULL DEFAULT -7,
  counter INTEGER NOT NULL DEFAULT 0,
  transports_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_user_passkeys_user ON admin_user_passkeys(user_id);
CREATE TABLE IF NOT EXISTS admin_auth_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  challenge TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_auth_challenges_user ON admin_auth_challenges(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_admin_auth_challenges_expiry ON admin_auth_challenges(expires_at);
CREATE TABLE IF NOT EXISTS security_rate_limits (
  key_hash TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key_hash, bucket)
);
CREATE INDEX IF NOT EXISTS idx_security_rate_limits_updated ON security_rate_limits(updated_at);
