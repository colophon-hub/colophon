import { base64Url, createAuthChallenge, ensureAccountSecurityTables, fromBase64Url, getAuthChallenge, markAuthChallengeUsed } from './accountSecurity.js'
import { getAdminUserByEmail, getAdminUserById, publicUser } from './adminUsers.js'

export function webauthnRp(context) {
  const url = new URL(context.request.url)
  return { rpId: url.hostname, origin: `${url.protocol}//${url.host}`, name: String(context?.env?.COLOPHON_WEBAUTHN_RP_NAME || context?.env?.colophon_WEBAUTHN_RP_NAME || 'Colophon').trim().slice(0, 80) || 'Colophon' }
}

export async function registrationOptions(context, db, user) {
  await ensureAccountSecurityTables(db)
  const rp = webauthnRp(context); const challenge = base64Url(randomBytes(32)); const record = await createAuthChallenge(db, user.id, 'webauthn-register', challenge, { rpId: rp.rpId, origin: rp.origin }, 300)
  const existing = await db.prepare('SELECT credential_id, transports_json FROM admin_user_passkeys WHERE user_id = ?').bind(String(user.id)).all()
  return { challengeId: record.id, publicKey: { challenge, rp: { id: rp.rpId, name: rp.name }, user: { id: base64Url(new TextEncoder().encode(String(user.id))), name: String(user.email), displayName: String(user.displayName || user.email) }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }], timeout: 60000, attestation: 'none', authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }, excludeCredentials: (existing?.results || []).map((row) => ({ type: 'public-key', id: String(row.credential_id), transports: parseJsonArray(row.transports_json) })) } }
}

export async function finishRegistration(context, db, user, input) {
  await ensureAccountSecurityTables(db)
  const record = await getAuthChallenge(db, input.challengeId, 'webauthn-register')
  if (!record || record.userId !== String(user.id)) throw new Error('registration challenge expired or invalid')
  await validateClientData(input.clientDataJSON, 'webauthn.create', record.challenge, record.metadata.origin)
  const credentialId = String(input.credentialId || ''); const publicKeySpki = String(input.publicKeySpki || ''); const algorithm = Number(input.algorithm || -7); const authenticatorData = fromBase64Url(input.authenticatorData || '')
  if (!credentialId || !publicKeySpki) throw new Error('passkey credential data is incomplete')
  if (algorithm !== -7) throw new Error('only ES256 passkeys are supported in this release')
  await validateAuthenticatorData(authenticatorData, record.metadata.rpId)
  await crypto.subtle.importKey('spki', fromBase64Url(publicKeySpki), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  const transports = Array.isArray(input.transports) ? input.transports.map(String).slice(0, 8) : []; const name = String(input.name || 'Passkey').trim().slice(0, 120) || 'Passkey'; const now = new Date().toISOString()
  await db.prepare(`INSERT INTO admin_user_passkeys (credential_id, user_id, name, public_key_spki, algorithm, counter, transports_json, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    ON CONFLICT(credential_id) DO UPDATE SET name = excluded.name, transports_json = excluded.transports_json`)
    .bind(credentialId, String(user.id), name, publicKeySpki, algorithm, JSON.stringify(transports), now).run()
  await markAuthChallengeUsed(db, record.id)
  return { id: credentialId, name, transports, createdAt: now, lastUsedAt: '' }
}

export async function authenticationOptions(context, db, email) {
  await ensureAccountSecurityTables(db)
  const userRow = await getAdminUserByEmail(db, email)
  if (!userRow || userRow.status !== 'active') return null
  const credentials = await db.prepare('SELECT credential_id, transports_json FROM admin_user_passkeys WHERE user_id = ?').bind(String(userRow.id)).all(); const rows = credentials?.results || []
  if (!rows.length) return null
  const rp = webauthnRp(context); const challenge = base64Url(randomBytes(32)); const record = await createAuthChallenge(db, userRow.id, 'webauthn-auth', challenge, { rpId: rp.rpId, origin: rp.origin }, 300)
  return { challengeId: record.id, publicKey: { challenge, rpId: rp.rpId, timeout: 60000, userVerification: 'preferred', allowCredentials: rows.map((row) => ({ type: 'public-key', id: String(row.credential_id), transports: parseJsonArray(row.transports_json) })) } }
}

export async function finishAuthentication(context, db, input) {
  await ensureAccountSecurityTables(db)
  const record = await getAuthChallenge(db, input.challengeId, 'webauthn-auth'); if (!record) throw new Error('passkey challenge expired or invalid')
  await validateClientData(input.clientDataJSON, 'webauthn.get', record.challenge, record.metadata.origin)
  const credentialId = String(input.credentialId || '')
  const credential = await db.prepare('SELECT credential_id, user_id, public_key_spki, algorithm, counter FROM admin_user_passkeys WHERE credential_id = ? AND user_id = ? LIMIT 1').bind(credentialId, record.userId).first()
  if (!credential) throw new Error('passkey is not registered for this account'); if (Number(credential.algorithm || -7) !== -7) throw new Error('unsupported passkey algorithm')
  const authenticatorData = fromBase64Url(input.authenticatorData || ''); const auth = await validateAuthenticatorData(authenticatorData, record.metadata.rpId); const clientData = fromBase64Url(input.clientDataJSON || ''); const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientData)); const signed = concatBytes(authenticatorData, clientHash); const signatureRaw = derEcdsaToRaw(fromBase64Url(input.signature || ''), 32)
  const key = await crypto.subtle.importKey('spki', fromBase64Url(credential.public_key_spki), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signatureRaw, signed); if (!valid) throw new Error('invalid passkey signature')
  const previousCounter = Number(credential.counter || 0); if (previousCounter > 0 && auth.counter > 0 && auth.counter <= previousCounter) throw new Error('passkey signature counter did not advance')
  await db.prepare('UPDATE admin_user_passkeys SET counter = ?, last_used_at = ? WHERE credential_id = ?').bind(Math.max(previousCounter, auth.counter), new Date().toISOString(), credentialId).run(); await markAuthChallengeUsed(db, record.id)
  const userRow = await getAdminUserById(db, record.userId); if (!userRow || userRow.status !== 'active') throw new Error('account is disabled or missing'); return publicUser(userRow)
}

async function validateClientData(clientDataBase64, expectedType, expectedChallenge, expectedOrigin) {
  const bytes = fromBase64Url(clientDataBase64 || ''); let data = null; try { data = JSON.parse(new TextDecoder().decode(bytes)) } catch {}
  if (!data || data.type !== expectedType) throw new Error('invalid WebAuthn client data type'); if (String(data.challenge || '') !== String(expectedChallenge || '')) throw new Error('WebAuthn challenge mismatch'); if (String(data.origin || '') !== String(expectedOrigin || '')) throw new Error('WebAuthn origin mismatch'); return data
}
async function validateAuthenticatorData(bytes, rpId) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 37) throw new Error('invalid authenticator data'); const expectedHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(rpId))))
  if (!timingSafeBytesEqual(bytes.slice(0, 32), expectedHash)) throw new Error('WebAuthn relying-party mismatch'); const flags = bytes[32]; if ((flags & 0x01) === 0) throw new Error('WebAuthn user-presence flag is missing'); const counter = ((bytes[33] << 24) | (bytes[34] << 16) | (bytes[35] << 8) | bytes[36]) >>> 0; return { flags, counter }
}
export function derEcdsaToRaw(der, size = 32) { const bytes = der instanceof Uint8Array ? der : new Uint8Array(der || []); if (bytes[0] !== 0x30) throw new Error('invalid DER ECDSA signature'); let offset = 1; const seq = readDerLength(bytes, offset); offset = seq.offset; if (bytes[offset++] !== 0x02) throw new Error('invalid DER ECDSA R value'); const rLen = readDerLength(bytes, offset); offset = rLen.offset; const r = bytes.slice(offset, offset + rLen.length); offset += rLen.length; if (bytes[offset++] !== 0x02) throw new Error('invalid DER ECDSA S value'); const sLen = readDerLength(bytes, offset); offset = sLen.offset; const s = bytes.slice(offset, offset + sLen.length); const raw = new Uint8Array(size * 2); raw.set(trimAndPad(r, size), 0); raw.set(trimAndPad(s, size), size); return raw }
function readDerLength(bytes, offset) { const first = bytes[offset++]; if (first < 0x80) return { length: first, offset }; const count = first & 0x7f; if (count < 1 || count > 2) throw new Error('unsupported DER length'); let length = 0; for (let i = 0; i < count; i += 1) length = (length << 8) | bytes[offset++]; return { length, offset } }
function trimAndPad(value, size) { let bytes = value; while (bytes.length > 1 && bytes[0] === 0) bytes = bytes.slice(1); if (bytes.length > size) throw new Error('DER integer is too large'); const out = new Uint8Array(size); out.set(bytes, size - bytes.length); return out }
function concatBytes(...parts) { const length = parts.reduce((sum, part) => sum + part.length, 0); const out = new Uint8Array(length); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length } return out }
function parseJsonArray(value) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] } }
function timingSafeBytesEqual(left, right) { const a = left || new Uint8Array(); const b = right || new Uint8Array(); let diff = a.length ^ b.length; const length = Math.max(a.length, b.length); for (let index = 0; index < length; index += 1) diff |= (a[index] || 0) ^ (b[index] || 0); return diff === 0 }
function randomBytes(length) { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return bytes }
