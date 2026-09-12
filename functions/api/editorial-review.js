import { getExistingNativeEntry, listNativeEntries, saveRevisionSnapshot, upsertNativeEntry } from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { appendEditorialComment, applyReviewAction, canReadPrivateEntry } from './_lib/editorialWorkflow.js'
import { writeAuditLog } from './_lib/auditLog.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { sendWebmentionsForEntry } from './_lib/webmentionSend.js'

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'content:write')) return json({ ok: false, error: 'content:write permission required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('editorial review queue')
    const all = await listNativeEntries(db, { includeFuture: true })
    const items = all.filter((entry) => canReadPrivateEntry(permission, entry))
    return json({ ok: true, items })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('editorial review')
    const body = await context.request.json()
    const nativeId = String(body?.nativeId || '')
    const action = String(body?.action || '')
    const note = String(body?.comment || '').trim()
    if (!nativeId || !action) return json({ ok: false, error: 'nativeId and action are required' }, 400)
    if (['request_changes', 'decline'].includes(action) && !note) return json({ ok: false, error: 'a comment is required when requesting changes or declining' }, 400)
    const entry = await getExistingNativeEntry(db, nativeId)
    if (!entry) return json({ ok: false, error: 'content not found' }, 404)
    await saveRevisionSnapshot(db, entry, `before:review:${action}`)
    let next = applyReviewAction(permission, entry, action, { scheduledFor: body?.scheduledFor })
    if (note) next = appendEditorialComment(next, permission, note, action)
    const saved = await upsertNativeEntry(db, next)
    await saveRevisionSnapshot(db, saved, `review:${action}`)
    if (saved.status === 'published') {
      const task = sendWebmentionsForEntry(context, db, saved).catch(() => [])
      if (typeof context.waitUntil === 'function') context.waitUntil(task)
      else task.catch(() => {})
    }
    await writeAuditLog(db, { action: `editorial.review.${action}`, entityType: 'native_content', entityId: saved.id, actor: permission.actor, detail: { workflowState: saved.workflowState, status: saved.status } })
    return json({ ok: true, item: saved })
  } catch (error) {
    const message = String(error?.message || error)
    return json({ ok: false, error: message }, /permission|contributors can only/i.test(message) ? 403 : 400)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
