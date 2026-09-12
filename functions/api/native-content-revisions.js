import {
  ensureNativeRevisionTable,
  getExistingNativeEntry,
  listRevisionSnapshots,
  restoreRevisionSnapshot,
} from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { canReadPrivateEntry } from './_lib/editorialWorkflow.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({
    ok: true,
    canEdit: permissionHasCapability(permission, 'content:write'),
    canRestore: permissionHasCapability(permission, 'review:manage') || permissionHasCapability(permission, 'publishing:write'),
    authMode: permission.mode,
    authReason: permission.reason,
    mode: getBoundDb(context) ? 'd1' : 'unavailable',
  })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'content:write')) return json({ ok: false, error: 'content:write permission required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native revision reads')
    const url = new URL(context.request.url)
    const nativeId = url.searchParams.get('nativeId') || ''
    const slug = url.searchParams.get('slug') || ''
    const entry = await getExistingNativeEntry(db, nativeId || slug)
    if (!entry) return json({ ok: false, error: 'content not found' }, 404)
    if (!canReadPrivateEntry(permission, entry)) return json({ ok: false, error: 'you do not have permission to view these revisions' }, 403)
    await ensureNativeRevisionTable(db)
    const items = await listRevisionSnapshots(db, entry.id)
    return json({ ok: true, mode: 'd1', items })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'review:manage') && !permissionHasCapability(permission, 'publishing:write')) {
      return json({ ok: false, error: 'review or publishing permission required to restore revisions' }, 403)
    }
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native revision restore')
    const body = await context.request.json()
    const revisionId = String(body?.revisionId || '')
    if (!revisionId) return json({ ok: false, error: 'missing revisionId' }, 400)
    const restored = await restoreRevisionSnapshot(db, revisionId)
    return json({ ok: true, mode: 'd1', item: restored })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
