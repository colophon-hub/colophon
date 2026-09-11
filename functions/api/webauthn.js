import { getBoundDb } from './_lib/database.js'
import { createAdminSessionCookie, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { consumeRateLimit, requestClientKey } from './_lib/rateLimit.js'
import { authenticationOptions, finishAuthentication, finishRegistration, registrationOptions } from './_lib/webauthn.js'
import { markAdminUserLogin } from './_lib/adminUsers.js'

export async function onRequestPost(context) {
  const db = getBoundDb(context); if (!db) return json({ ok: false, error: 'Passkeys require the shared/server edition database.' }, 503)
  try {
    const body = await context.request.json().catch(() => ({})); const action = String(body?.action || ''); const rate = await consumeRateLimit(db, `webauthn:${action}:${requestClientKey(context.request)}`, { limit: 25, windowSeconds: 300 })
    if (!rate.ok) return json({ ok: false, error: 'Too many passkey attempts. Try again later.', retryAfter: rate.retryAfter }, 429, { 'retry-after': String(rate.retryAfter) })
    if (action === 'register.options' || action === 'register.finish') {
      const permission = await resolvePublicSitePermission(context); if (!permission?.user?.id) return json({ ok: false, error: 'An individual server account session is required.' }, 401)
      if (action === 'register.options') return json({ ok: true, ...(await registrationOptions(context, db, permission.user)) })
      return json({ ok: true, passkey: await finishRegistration(context, db, permission.user, body) })
    }
    if (action === 'authenticate.options') { const options = await authenticationOptions(context, db, String(body.email || '').trim().toLowerCase()); return options ? json({ ok: true, ...options }) : json({ ok: false, error: 'No passkey is available for that account.' }, 404) }
    if (action === 'authenticate.finish') { const user = await finishAuthentication(context, db, body); const cookie = await createAdminSessionCookie(context, user); await markAdminUserLogin(db, user.id); return json({ ok: true, authenticated: true, mode: 'passkey', user, role: user.role, capabilities: user.capabilities }, 200, { 'set-cookie': cookie }) }
    return json({ ok: false, error: 'Unknown WebAuthn action.' }, 400)
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 400) }
}
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } }) }
