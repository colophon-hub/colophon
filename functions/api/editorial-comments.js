import { getExistingNativeEntry, saveRevisionSnapshot, upsertNativeEntry } from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { appendEditorialComment, canReadPrivateEntry } from './_lib/editorialWorkflow.js'
import { writeAuditLog } from './_lib/auditLog.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('editorial comments')
    const id = new URL(context.request.url).searchParams.get('nativeId') || ''
    if (!id) return json({ ok: false, error: 'missing nativeId' }, 400)
    const entry = await getExistingNativeEntry(db, id)
    if (!entry) return json({ ok: false, error: 'content not found' }, 404)
    if (!canReadPrivateEntry(permission, entry)) return json({ ok: false, error: 'you do not have permission to view these comments' }, 403)
    return json({ ok: true, items: entry.editorialComments || [] })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'review:comment')) return json({ ok: false, error: 'review:comment permission required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('editorial comments')
    const body = await context.request.json()
    const nativeId = String(body?.nativeId || '')
    const text = String(body?.body || '')
    if (!nativeId) return json({ ok: false, error: 'missing nativeId' }, 400)
    const entry = await getExistingNativeEntry(db, nativeId)
    if (!entry) return json({ ok: false, error: 'content not found' }, 404)
    await saveRevisionSnapshot(db, entry, 'before:editorial-comment')
    const next = appendEditorialComment(entry, permission, text, body?.kind || 'comment')
    const saved = await upsertNativeEntry(db, next)
    await saveRevisionSnapshot(db, saved, 'editorial-comment')
    const comment = saved.editorialComments[saved.editorialComments.length - 1]
    await writeAuditLog(db, { action: 'editorial.comment', entityType: 'native_content', entityId: saved.id, actor: permission.actor, detail: { commentId: comment?.id || '', kind: comment?.kind || 'comment' } })
    return json({ ok: true, item: saved, comment })
  } catch (error) {
    const message = String(error?.message || error)
    return json({ ok: false, error: message }, /permission/i.test(message) ? 403 : 400)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
