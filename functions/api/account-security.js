import { getAdminUserById, verifyPassword } from './_lib/adminUsers.js'
import { beginTotpEnrollment, confirmTotpEnrollment, disableTotp, getAccountSecurityStatus, regenerateRecoveryCodes, removePasskey, verifyTotpForUser } from './_lib/accountSecurity.js'
import { getBoundDb } from './_lib/database.js'
import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { consumeRateLimit, requestClientKey } from './_lib/rateLimit.js'

export async function onRequestGet(context) {
  try { const auth = await accountIdentity(context); if (!auth.ok) return json(auth, auth.status); return json({ ok: true, available: true, user: auth.user, ...(await getAccountSecurityStatus(auth.db, auth.user.id)) }) }
  catch (error) { return json({ ok: false, error: String(error?.message || error) }, 500) }
}

export async function onRequestPost(context) {
  try {
    const auth = await accountIdentity(context); if (!auth.ok) return json(auth, auth.status)
    const rate = await consumeRateLimit(auth.db, `account-security:${auth.user.id}:${requestClientKey(context.request)}`, { limit: 30, windowSeconds: 300 })
    if (!rate.ok) return json({ ok: false, error: 'Too many security-setting attempts. Try again later.', retryAfter: rate.retryAfter }, 429, { 'retry-after': String(rate.retryAfter) })
    const body = await context.request.json().catch(() => ({})); const action = String(body?.action || '')
    if (action === 'totp.begin') return json({ ok: true, enrollment: await beginTotpEnrollment(context, auth.db, auth.user) })
    if (action === 'totp.confirm') { const result = await confirmTotpEnrollment(context, auth.db, auth.user.id, body.code); return json({ ok: true, totpEnabled: true, recoveryCodes: result.recoveryCodes }) }
    if (action === 'totp.disable') { await requirePassword(auth.db, auth.user.id, body.password); await disableTotp(auth.db, auth.user.id); return json({ ok: true, totpEnabled: false }) }
    if (action === 'recovery.regenerate') { await requirePassword(auth.db, auth.user.id, body.password); if (body.code && !(await verifyTotpForUser(context, auth.db, auth.user.id, body.code))) return json({ ok: false, error: 'Invalid authenticator code.' }, 401); const result = await regenerateRecoveryCodes(auth.db, auth.user.id); return json({ ok: true, recoveryCodes: result.recoveryCodes }) }
    if (action === 'passkey.remove') { await requirePassword(auth.db, auth.user.id, body.password); await removePasskey(auth.db, auth.user.id, body.credentialId); return json({ ok: true }) }
    return json({ ok: false, error: 'Unknown account-security action.' }, 400)
  } catch (error) { const message = String(error?.message || error); return json({ ok: false, error: message }, /password|authenticator|code/i.test(message) ? 401 : 400) }
}

async function accountIdentity(context) {
  const permission = await resolvePublicSitePermission(context); const db = getBoundDb(context)
  if (!db) return { ok: false, available: false, error: 'Server account security requires the shared/server edition database.', status: 503 }
  if (!permission?.user?.id) return { ok: false, available: false, error: 'Sign in with an individual server account to manage account security.', status: 401 }
  return { ok: true, db, permission, user: permission.user }
}
async function requirePassword(db, userId, password) { const row = await getAdminUserById(db, userId); if (!row || !(await verifyPassword(String(password || ''), row))) throw new Error('Current password is incorrect.') }
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } }) }
