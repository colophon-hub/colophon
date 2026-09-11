import { createAdminSessionCookie, validateAdminLoginToken } from './_lib/publicSiteAuth.js'
import { getAdminUserByEmail, getAdminUserById, markAdminUserLogin, publicUser, verifyPassword } from './_lib/adminUsers.js'
import { createSecondFactorChallenge, hasTotpEnabled, verifySecondFactorChallenge } from './_lib/accountSecurity.js'
import { consumeRateLimit, requestClientKey } from './_lib/rateLimit.js'

export async function onRequestPost(context) {
  let body = null
  try { body = await context.request.json() } catch { body = {} }
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const token = String(body?.token || '').trim()
  const challengeId = String(body?.challengeId || '').trim()
  const code = String(body?.code || '').trim()
  if (challengeId && code) return completeSecondFactor(context, challengeId, code)
  if (email) return loginUser(context, email, password)
  if (token) return loginBootstrap(context, token)
  return json({ ok: false, authenticated: false, error: 'email and password are required' }, 400)
}

async function loginUser(context, email, password) {
  const db = context?.env?.BF_DB
  if (!db) return json({ ok: false, authenticated: false, error: 'user login unavailable: BF_DB is not bound' }, 503)
  const rate = await consumeRateLimit(db, `password-login:${requestClientKey(context.request)}:${email}`, { limit: 10, windowSeconds: 300 })
  if (!rate.ok) return json({ ok: false, authenticated: false, error: 'Too many login attempts. Try again later.', retryAfter: rate.retryAfter }, 429, { 'retry-after': String(rate.retryAfter) })
  try {
    const row = await getAdminUserByEmail(db, email)
    const valid = row?.status === 'active' && await verifyPassword(password, row)
    if (!valid) return json({ ok: false, authenticated: false, error: 'Invalid email or password.' }, 401)
    const user = publicUser(row)
    if (await hasTotpEnabled(db, user.id)) {
      const challenge = await createSecondFactorChallenge(db, user.id)
      return json({ ok: true, authenticated: false, requiresSecondFactor: true, challengeId: challenge.id, methods: ['totp', 'recovery-code'] })
    }
    return completeUserLogin(context, db, user, 'user')
  } catch (error) { return json({ ok: false, authenticated: false, error: String(error?.message || error) }, 500) }
}

async function completeSecondFactor(context, challengeId, code) {
  const db = context?.env?.BF_DB
  if (!db) return json({ ok: false, authenticated: false, error: 'user login unavailable: BF_DB is not bound' }, 503)
  const rate = await consumeRateLimit(db, `second-factor:${requestClientKey(context.request)}:${challengeId}`, { limit: 8, windowSeconds: 300 })
  if (!rate.ok) return json({ ok: false, authenticated: false, error: 'Too many verification attempts. Try again later.', retryAfter: rate.retryAfter }, 429, { 'retry-after': String(rate.retryAfter) })
  try {
    const verified = await verifySecondFactorChallenge(context, db, challengeId, code)
    const row = await getAdminUserById(db, verified.userId)
    if (!row || row.status !== 'active') return json({ ok: false, authenticated: false, error: 'Account is disabled or missing.' }, 401)
    return completeUserLogin(context, db, publicUser(row), verified.usedRecovery ? 'recovery-code' : 'totp')
  } catch (error) { return json({ ok: false, authenticated: false, error: String(error?.message || error) }, 401) }
}

async function completeUserLogin(context, db, user, mode) {
  const cookie = await createAdminSessionCookie(context, user)
  await markAdminUserLogin(db, user.id)
  return json({ ok: true, authenticated: true, mode, user, role: user.role, capabilities: user.capabilities }, 200, { 'set-cookie': cookie })
}

async function loginBootstrap(context, token) {
  const result = validateAdminLoginToken(context, token)
  if (!result.ok) return json({ ok: false, authenticated: false, error: result.reason }, 401)
  try { const cookie = await createAdminSessionCookie(context, 'bootstrap-owner'); return json({ ok: true, authenticated: true, mode: 'bootstrap', role: 'owner', capabilities: ['*'] }, 200, { 'set-cookie': cookie }) }
  catch (error) { return json({ ok: false, authenticated: false, error: String(error?.message || error) }, 500) }
}
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } }) }
