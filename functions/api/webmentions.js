import { getBoundDb } from './_lib/database.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import {
  deleteWebmention,
  listWebmentions,
  reverifyWebmention,
  setWebmentionState,
} from './_lib/webmentions.js'
import { listOutboundWebmentions } from './_lib/webmentionSend.js'

async function requireEditor(context) {
  const permission = await resolvePublicSitePermission(context)
  return permissionHasCapability(permission, 'publishing:write') ? permission : null
}

export async function onRequestGet(context) {
  const permission = await requireEditor(context)
  if (!permission) return json({ ok: false, error: 'publishing:write permission required' }, 403)

  const db = getBoundDb(context)
  if (!db) return json({ ok: false, error: 'database unavailable' }, 503)

  const url = new URL(context.request.url)
  if (url.searchParams.get('direction') === 'outbound') {
    const items = await listOutboundWebmentions(db, {
      status: url.searchParams.get('status') || '',
      limit: url.searchParams.get('limit') || 100,
    })
    return json({ ok: true, direction: 'outbound', items })
  }

  const items = await listWebmentions(db, {
    target: url.searchParams.get('target') || '',
    state: url.searchParams.get('state') || '',
    limit: url.searchParams.get('limit') || 100,
  })
  return json({ ok: true, direction: 'inbound', items })
}

export async function onRequestPost(context) {
  const permission = await requireEditor(context)
  if (!permission) return json({ ok: false, error: 'publishing:write permission required' }, 403)

  const db = getBoundDb(context)
  if (!db) return json({ ok: false, error: 'database unavailable' }, 503)

  try {
    const body = await context.request.json()
    const action = String(body?.action || '')
    const id = String(body?.id || '')
    if (!id) return json({ ok: false, error: 'id is required' }, 400)

    if (action === 'approve') return json({ ok: true, item: await setWebmentionState(db, id, 'approved') })
    if (action === 'reject') return json({ ok: true, item: await setWebmentionState(db, id, 'rejected') })
    if (action === 'spam') return json({ ok: true, item: await setWebmentionState(db, id, 'spam') })
    if (action === 'reverify') return json({ ok: true, item: await reverifyWebmention(context, db, id) })
    if (action === 'delete') {
      await deleteWebmention(db, id)
      return json({ ok: true, deleted: true })
    }
    return json({ ok: false, error: 'unknown moderation action' }, 400)
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
