import { getBoundDb } from './_lib/database.js'
import { consumeRateLimit, requestClientKey } from './_lib/rateLimit.js'
import {
  listApprovedMentions,
  upsertVerifiedWebmention,
  validateLocalTarget,
  verifyIncomingWebmention,
} from './_lib/webmentions.js'

export async function onRequestGet(context) {
  const db = getBoundDb(context)
  if (!db) return json({ ok: true, endpoint: true, items: [] })

  const url = new URL(context.request.url)
  const targetValue = url.searchParams.get('target') || ''
  if (!targetValue) return json({ ok: true, endpoint: true, protocol: 'Webmention' })

  try {
    const target = validateLocalTarget(context, targetValue)
    return json({ ok: true, items: await listApprovedMentions(db, target.toString()) })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

export async function onRequestPost(context) {
  const db = getBoundDb(context)
  if (!db) {
    return json({ ok: false, error: 'Webmention receiving requires the shared/server edition database.' }, 503)
  }

  try {
    const rate = await consumeRateLimit(
      db,
      `webmention-receive:${requestClientKey(context.request)}`,
      { limit: 30, windowSeconds: 3600 },
    )
    if (!rate.ok) {
      return json(
        { ok: false, error: 'Too many Webmention submissions. Try again later.', retryAfter: rate.retryAfter },
        429,
        { 'retry-after': String(rate.retryAfter) },
      )
    }

    const body = await parseBody(context.request)
    const source = String(body.source || '')
    const target = String(body.target || '')
    if (!source || !target) return json({ ok: false, error: 'source and target are required' }, 400)

    const verified = await verifyIncomingWebmention(context, source, target)
    const saved = await upsertVerifiedWebmention(db, verified, { preserveState: true })
    return json({ ok: true, accepted: true, moderation: saved.state, id: saved.id }, 202)
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

async function parseBody(request) {
  const type = String(request.headers.get('content-type') || '').toLowerCase()
  if (type.includes('application/json')) return request.json().catch(() => ({}))
  const form = await request.formData()
  return Object.fromEntries(form.entries())
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  })
}
