export async function ensureRateLimitTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS security_rate_limits (
    key_hash TEXT NOT NULL,
    bucket INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (key_hash, bucket)
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_security_rate_limits_updated ON security_rate_limits(updated_at)').run()
}

export async function hashRateLimitKey(value) {
  const bytes = new TextEncoder().encode(String(value || ''))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function consumeRateLimit(db, key, { limit = 10, windowSeconds = 300 } = {}) {
  if (!db) return { ok: false, retryAfter: windowSeconds, remaining: 0 }
  await ensureRateLimitTable(db)
  const now = Math.floor(Date.now() / 1000)
  const bucket = Math.floor(now / windowSeconds)
  const keyHash = await hashRateLimitKey(key)
  await db.prepare(`INSERT INTO security_rate_limits (key_hash, bucket, attempts, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(key_hash, bucket) DO UPDATE SET attempts = attempts + 1, updated_at = excluded.updated_at`)
    .bind(keyHash, bucket, new Date().toISOString()).run()
  const row = await db.prepare('SELECT attempts FROM security_rate_limits WHERE key_hash = ? AND bucket = ?').bind(keyHash, bucket).first()
  const attempts = Number(row?.attempts || 0)
  const retryAfter = Math.max(1, ((bucket + 1) * windowSeconds) - now)
  return { ok: attempts <= limit, attempts, remaining: Math.max(0, limit - attempts), retryAfter }
}

export function requestClientKey(request) {
  const direct = String(request?.headers?.get('cf-connecting-ip') || '').trim()
  if (direct) return direct
  const forwarded = String(request?.headers?.get('x-forwarded-for') || '').split(',')[0].trim()
  return forwarded || 'unknown-client'
}
