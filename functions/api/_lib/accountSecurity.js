export const TOTP_PERIOD_SECONDS = 30
export const TOTP_DIGITS = 6
const TOTP_SECRET_BYTES = 20
const SECOND_FACTOR_TTL_SECONDS = 5 * 60
const RECOVERY_CODE_COUNT = 10

export async function ensureAccountSecurityTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_user_security (
    user_id TEXT PRIMARY KEY,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    totp_secret_cipher TEXT,
    totp_secret_nonce TEXT,
    totp_pending_cipher TEXT,
    totp_pending_nonce TEXT,
    recovery_codes_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_user_passkeys (
    credential_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Passkey',
    public_key_spki TEXT NOT NULL,
    algorithm INTEGER NOT NULL DEFAULT -7,
    counter INTEGER NOT NULL DEFAULT 0,
    transports_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_admin_user_passkeys_user ON admin_user_passkeys(user_id)').run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_auth_challenges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    challenge TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_admin_auth_challenges_user ON admin_auth_challenges(user_id, kind)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_admin_auth_challenges_expiry ON admin_auth_challenges(expires_at)').run()
}

export async function getAccountSecurityStatus(db, userId) {
  await ensureAccountSecurityTables(db)
  const row = await db.prepare('SELECT totp_enabled, recovery_codes_json, updated_at FROM admin_user_security WHERE user_id = ?').bind(String(userId)).first()
  const passkeys = await listPasskeys(db, userId)
  let recovery = []
  try { recovery = JSON.parse(row?.recovery_codes_json || '[]') } catch {}
  return { totpEnabled: Number(row?.totp_enabled || 0) === 1, recoveryCodesRemaining: Array.isArray(recovery) ? recovery.length : 0, passkeys, updatedAt: String(row?.updated_at || '') }
}

export async function beginTotpEnrollment(context, db, user) {
  await ensureAccountSecurityTables(db)
  const secretBytes = randomBytes(TOTP_SECRET_BYTES)
  const encrypted = await encryptSecret(context, secretBytes)
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO admin_user_security (user_id, totp_enabled, totp_pending_cipher, totp_pending_nonce, recovery_codes_json, updated_at)
    VALUES (?, 0, ?, ?, '[]', ?)
    ON CONFLICT(user_id) DO UPDATE SET totp_pending_cipher = excluded.totp_pending_cipher, totp_pending_nonce = excluded.totp_pending_nonce, updated_at = excluded.updated_at`)
    .bind(String(user.id), encrypted.ciphertext, encrypted.nonce, now).run()
  const secret = base32Encode(secretBytes)
  const issuer = String(context?.env?.COLOPHON_TOTP_ISSUER || context?.env?.colophon_TOTP_ISSUER || 'Colophon').trim().slice(0, 80) || 'Colophon'
  const account = String(user.email || user.id)
  const label = `${issuer}:${account}`
  return { secret, issuer, account, otpauthUri: `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}` }
}

export async function confirmTotpEnrollment(context, db, userId, code) {
  await ensureAccountSecurityTables(db)
  const row = await db.prepare('SELECT totp_pending_cipher, totp_pending_nonce FROM admin_user_security WHERE user_id = ?').bind(String(userId)).first()
  if (!row?.totp_pending_cipher || !row?.totp_pending_nonce) throw new Error('no pending TOTP enrollment')
  const secret = await decryptSecret(context, row.totp_pending_cipher, row.totp_pending_nonce)
  if (!(await verifyTotpCode(secret, code))) throw new Error('invalid authenticator code')
  const encrypted = await encryptSecret(context, secret)
  const recoveryCodes = makeRecoveryCodes()
  const recoveryHashes = []
  for (const recoveryCode of recoveryCodes) recoveryHashes.push(await hashRecoveryCode(recoveryCode))
  const now = new Date().toISOString()
  await db.prepare(`UPDATE admin_user_security SET totp_enabled = 1, totp_secret_cipher = ?, totp_secret_nonce = ?,
    totp_pending_cipher = NULL, totp_pending_nonce = NULL, recovery_codes_json = ?, updated_at = ? WHERE user_id = ?`)
    .bind(encrypted.ciphertext, encrypted.nonce, JSON.stringify(recoveryHashes), now, String(userId)).run()
  return { recoveryCodes }
}

export async function disableTotp(db, userId) {
  await ensureAccountSecurityTables(db)
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO admin_user_security (user_id, totp_enabled, recovery_codes_json, updated_at) VALUES (?, 0, '[]', ?)
    ON CONFLICT(user_id) DO UPDATE SET totp_enabled = 0, totp_secret_cipher = NULL, totp_secret_nonce = NULL,
    totp_pending_cipher = NULL, totp_pending_nonce = NULL, recovery_codes_json = '[]', updated_at = excluded.updated_at`)
    .bind(String(userId), now).run()
}

export async function regenerateRecoveryCodes(db, userId) {
  await ensureAccountSecurityTables(db)
  const row = await db.prepare('SELECT totp_enabled FROM admin_user_security WHERE user_id = ?').bind(String(userId)).first()
  if (Number(row?.totp_enabled || 0) !== 1) throw new Error('TOTP is not enabled')
  const recoveryCodes = makeRecoveryCodes(); const hashes = []
  for (const code of recoveryCodes) hashes.push(await hashRecoveryCode(code))
  await db.prepare('UPDATE admin_user_security SET recovery_codes_json = ?, updated_at = ? WHERE user_id = ?').bind(JSON.stringify(hashes), new Date().toISOString(), String(userId)).run()
  return { recoveryCodes }
}

export async function createSecondFactorChallenge(db, userId) {
  return createAuthChallenge(db, userId, 'totp-login', base64Url(randomBytes(32)), {}, SECOND_FACTOR_TTL_SECONDS)
}

export async function verifySecondFactorChallenge(context, db, challengeId, code) {
  const record = await getAuthChallenge(db, challengeId, 'totp-login')
  if (!record) throw new Error('second-factor challenge expired or invalid')
  const row = await db.prepare('SELECT totp_enabled, totp_secret_cipher, totp_secret_nonce, recovery_codes_json FROM admin_user_security WHERE user_id = ?').bind(record.userId).first()
  if (Number(row?.totp_enabled || 0) !== 1 || !row?.totp_secret_cipher) throw new Error('TOTP is not enabled for this account')
  const normalizedCode = String(code || '').trim().toUpperCase()
  let verified = false; let usedRecovery = false
  if (/^\d{6}$/.test(normalizedCode)) {
    const secret = await decryptSecret(context, row.totp_secret_cipher, row.totp_secret_nonce)
    verified = await verifyTotpCode(secret, normalizedCode)
  }
  if (!verified && normalizedCode) {
    let hashes = []; try { hashes = JSON.parse(row.recovery_codes_json || '[]') } catch {}
    const candidate = await hashRecoveryCode(normalizedCode)
    const index = hashes.findIndex((item) => timingSafeStringEqual(item, candidate))
    if (index >= 0) { hashes.splice(index, 1); await db.prepare('UPDATE admin_user_security SET recovery_codes_json = ?, updated_at = ? WHERE user_id = ?').bind(JSON.stringify(hashes), new Date().toISOString(), record.userId).run(); verified = true; usedRecovery = true }
  }
  if (!verified) throw new Error('invalid authenticator or recovery code')
  await markAuthChallengeUsed(db, challengeId)
  return { userId: record.userId, usedRecovery }
}

export async function verifyTotpForUser(context, db, userId, code) {
  await ensureAccountSecurityTables(db)
  const row = await db.prepare('SELECT totp_enabled, totp_secret_cipher, totp_secret_nonce FROM admin_user_security WHERE user_id = ?').bind(String(userId)).first()
  if (Number(row?.totp_enabled || 0) !== 1 || !row?.totp_secret_cipher) return false
  return verifyTotpCode(await decryptSecret(context, row.totp_secret_cipher, row.totp_secret_nonce), code)
}
export async function hasTotpEnabled(db, userId) { await ensureAccountSecurityTables(db); const row = await db.prepare('SELECT totp_enabled FROM admin_user_security WHERE user_id = ?').bind(String(userId)).first(); return Number(row?.totp_enabled || 0) === 1 }

export async function listPasskeys(db, userId) {
  await ensureAccountSecurityTables(db)
  const result = await db.prepare('SELECT credential_id, name, transports_json, created_at, last_used_at FROM admin_user_passkeys WHERE user_id = ? ORDER BY datetime(created_at) DESC').bind(String(userId)).all()
  return (result?.results || []).map((row) => ({ id: String(row.credential_id || ''), name: String(row.name || 'Passkey'), transports: parseJsonArray(row.transports_json), createdAt: String(row.created_at || ''), lastUsedAt: String(row.last_used_at || '') }))
}
export async function removePasskey(db, userId, credentialId) { await ensureAccountSecurityTables(db); await db.prepare('DELETE FROM admin_user_passkeys WHERE user_id = ? AND credential_id = ?').bind(String(userId), String(credentialId)).run() }

export async function createAuthChallenge(db, userId, kind, challenge, metadata = {}, ttlSeconds = 300) {
  await ensureAccountSecurityTables(db)
  const id = `auth-${crypto.randomUUID?.() || randomHex(16)}`; const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  await db.prepare('INSERT INTO admin_auth_challenges (id, user_id, kind, challenge, metadata_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, String(userId), String(kind), String(challenge), JSON.stringify(metadata || {}), expires, new Date().toISOString()).run()
  return { id, challenge, expiresAt: expires }
}
export async function getAuthChallenge(db, id, expectedKind = '') {
  await ensureAccountSecurityTables(db)
  const row = await db.prepare('SELECT id, user_id, kind, challenge, metadata_json, expires_at, used_at FROM admin_auth_challenges WHERE id = ? LIMIT 1').bind(String(id)).first()
  if (!row || row.used_at || (expectedKind && row.kind !== expectedKind) || new Date(row.expires_at).getTime() <= Date.now()) return null
  let metadata = {}; try { metadata = JSON.parse(row.metadata_json || '{}') } catch {}
  return { id: String(row.id), userId: String(row.user_id), kind: String(row.kind), challenge: String(row.challenge), metadata, expiresAt: String(row.expires_at) }
}
export async function markAuthChallengeUsed(db, id) { await ensureAccountSecurityTables(db); await db.prepare('UPDATE admin_auth_challenges SET used_at = ? WHERE id = ?').bind(new Date().toISOString(), String(id)).run() }

export async function verifyTotpCode(secretBytes, code, nowMs = Date.now(), window = 1) {
  const normalized = String(code || '').trim(); if (!/^\d{6}$/.test(normalized)) return false
  const counter = Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS)
  for (let offset = -window; offset <= window; offset += 1) if (timingSafeStringEqual(await generateTotpCode(secretBytes, counter + offset), normalized)) return true
  return false
}
export async function generateTotpCode(secretBytes, counter) {
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const msg = new Uint8Array(8); let value = BigInt(counter)
  for (let index = 7; index >= 0; index -= 1) { msg[index] = Number(value & 0xffn); value >>= 8n }
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)); const offset = signature[signature.length - 1] & 0x0f
  const binary = ((signature[offset] & 0x7f) << 24) | ((signature[offset + 1] & 0xff) << 16) | ((signature[offset + 2] & 0xff) << 8) | (signature[offset + 3] & 0xff)
  return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0')
}

async function encryptSecret(context, bytes) { const key = await encryptionKey(context); const nonce = randomBytes(12); const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, bytes); return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), nonce: bytesToBase64(nonce) } }
async function decryptSecret(context, ciphertext, nonce) { const key = await encryptionKey(context); const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(nonce) }, key, base64ToBytes(ciphertext)); return new Uint8Array(plain) }
async function encryptionKey(context) { const secret = String(context?.env?.COLOPHON_2FA_ENCRYPTION_KEY || context?.env?.colophon_2FA_ENCRYPTION_KEY || ''); if (secret.length < 32) throw new Error('COLOPHON_2FA_ENCRYPTION_KEY must be configured with at least 32 characters'); const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)); return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']) }
function makeRecoveryCodes() { return Array.from({ length: RECOVERY_CODE_COUNT }, () => { const raw = base32Encode(randomBytes(10)).slice(0, 16); return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}` }) }
async function hashRecoveryCode(code) { const normalized = String(code || '').toUpperCase().replace(/[^A-Z2-7]/g, ''); const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`colophon-recovery-v1:${normalized}`)); return bytesToBase64(new Uint8Array(digest)) }
function base32Encode(bytes) { const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, value = 0, output = ''; for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5 } } if (bits > 0) output += alphabet[(value << (5 - bits)) & 31]; return output }
export function base64Url(bytes) { return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') }
export function fromBase64Url(value) { const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/'); return base64ToBytes(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')) }
function bytesToBase64(bytes) { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary) }
function base64ToBytes(value) { const binary = atob(String(value || '')); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes }
function parseJsonArray(value) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] } }
function randomBytes(length) { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return bytes }
function randomHex(length) { return Array.from(randomBytes(length), (byte) => byte.toString(16).padStart(2, '0')).join('') }
function timingSafeStringEqual(left, right) { const a = new TextEncoder().encode(String(left || '')); const b = new TextEncoder().encode(String(right || '')); let diff = a.length ^ b.length; const length = Math.max(a.length, b.length); for (let index = 0; index < length; index += 1) diff |= (a[index] || 0) ^ (b[index] || 0); return diff === 0 }
