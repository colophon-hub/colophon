import {
  ensureNativePublicContentTable,
  ensureNativeRevisionTable,
  listNativeEntries,
  getNativeEntry,
  getExistingNativeEntry,
  upsertNativeEntry,
  deleteNativeEntry,
  saveRevisionSnapshot,
} from './_lib/nativePublicContent.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { canReadPrivateEntry, prepareEntryForWrite } from './_lib/editorialWorkflow.js'
import { writeAuditLog } from './_lib/auditLog.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { sendWebmentionsForEntry } from './_lib/webmentionSend.js'

const PRIVATE_NATIVE_FIELDS = new Set([
  'sourceNotes', 'transcriptNotes', 'workflowState', 'editorialNotes', 'moderationNotes',
  'storageKey', 'podcastStorageKey', 'podcastMediaId', 'privateUrl', 'internalNotes',
  'internalMetadata', 'providerSecrets', 'providerConfig', 'contributorId', 'contactEmail', 'contactPhone',
  'ownerAccountId', 'ownerEmail', 'submittedAt', 'reviewedAt', 'reviewedBy', 'declinedAt', 'declinedBy', 'editorialComments',
])
const PRIVATE_ASSET_FIELDS = new Set([
  'storageKey', 'customMetadata', 'contributorId', 'campaignId', 'privateUrl', 'internalNotes',
  'editorialNotes', 'moderationNotes', 'providerData',
])

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({
    ok: true,
    canEdit: permissionHasCapability(permission, 'content:write'),
    canPublish: permissionHasCapability(permission, 'publishing:write'),
    canReview: permissionHasCapability(permission, 'review:manage'),
    authMode: permission.mode,
    authReason: permission.reason,
    mode: getBoundDb(context) ? 'd1' : 'unavailable',
  })
}

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || ''
    const slug = url.searchParams.get('slug') || ''
    const status = url.searchParams.get('status') || ''
    const target = url.searchParams.get('target') || ''
    const workflowState = url.searchParams.get('workflowState') || ''
    const canWrite = permissionHasCapability(permission, 'content:write')
    const includeFuture = canWrite
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native content reads')
    await ensureNativePublicContentTable(db)
    await ensureNativeRevisionTable(db)

    if (id || slug) {
      if (canWrite) {
        const item = await getExistingNativeEntry(db, id || slug)
        if (!item) return json({ ok: true, mode: 'd1', item: null })
        if (!canReadPrivateEntry(permission, item)) return json({ ok: false, error: 'you do not have permission to view this content' }, 403)
        return json({ ok: true, mode: 'd1', item })
      }
      const item = await getNativeEntry(db, id || slug, { includeFuture: false })
      return json({ ok: true, mode: 'd1', item: publicNativeItem(item) })
    }

    const items = await listNativeEntries(db, {
      status: status || undefined,
      target: target || undefined,
      workflowState: workflowState || undefined,
      includeFuture,
    })
    const visible = canWrite
      ? items.filter((item) => canReadPrivateEntry(permission, item))
      : items.map(publicNativeItem)
    return json({ ok: true, mode: 'd1', items: visible })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) { return handleWrite(context) }
export async function onRequestPut(context) { return handleWrite(context) }

export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'publishing:write') && !permissionHasCapability(permission, 'review:manage')) {
      return json({ ok: false, error: 'publishing or review permission required' }, 403)
    }
    const url = new URL(context.request.url)
    const id = url.searchParams.get('id') || url.searchParams.get('slug') || ''
    if (!id) return json({ ok: false, error: 'missing id or slug' }, 400)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native content deletion')
    const existing = await getExistingNativeEntry(db, id)
    if (existing) await saveRevisionSnapshot(db, existing, 'delete:before')
    const result = await deleteNativeEntry(db, id)
    await writeAuditLog(db, { action: 'native_content.delete', entityType: 'native_content', entityId: id, actor: permission.actor, detail: result })
    return json({ ok: true, mode: 'd1', ...result })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

async function handleWrite(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'content:write')) return json({ ok: false, error: 'content:write permission required' }, 403)
    const body = await context.request.json()
    const requested = { ...(body?.item || body || {}) }
    const revisionNote = String(body?.revisionNote || requested?.revisionNote || 'save')
    const expectedUpdatedAt = String(body?.expectedUpdatedAt || '')
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('native content writes')
    await ensureNativePublicContentTable(db)
    await ensureNativeRevisionTable(db)

    const existing = requested?.id ? await getExistingNativeEntry(db, requested.id) : null
    if (existing && expectedUpdatedAt && String(existing.updatedAt || '') !== expectedUpdatedAt) {
      return json({ ok: false, conflict: true, error: 'This content changed since you opened it. Reload the latest version before saving over it.', current: existing }, 409)
    }
    const item = prepareEntryForWrite(permission, existing, requested)
    if (existing && !String(item.slug || '').trim()) item.slug = existing.slug
    if (existing) await saveRevisionSnapshot(db, existing, `before:${revisionNote}`)

    const saved = await upsertNativeEntry(db, item)
    await saveRevisionSnapshot(db, saved, revisionNote)
    if (saved.status === 'published' && !['autosave', 'preview'].includes(revisionNote)) {
      const task = sendWebmentionsForEntry(context, db, saved).catch(() => [])
      if (typeof context.waitUntil === 'function') context.waitUntil(task)
      else task.catch(() => {})
    }
    await writeAuditLog(db, {
      action: 'native_content.upsert', entityType: 'native_content', entityId: saved.id, actor: permission.actor,
      detail: { revisionNote, status: saved.status, workflowState: saved.workflowState, target: saved.target, slug: saved.slug, ownerAccountId: saved.ownerAccountId || '' },
    })
    return json({ ok: true, mode: 'd1', item: saved })
  } catch (error) {
    const message = String(error?.message || error)
    const denied = /permission|contributors cannot|only an editor|ownership/i.test(message)
    return json({ ok: false, error: message }, denied ? 403 : 400)
  }
}

export function publicNativeItem(item) {
  if (!item || typeof item !== 'object') return item
  const projected = omitFields(item, PRIVATE_NATIVE_FIELDS)
  if (Array.isArray(projected.relatedAssets)) projected.relatedAssets = projected.relatedAssets.map(publicRelatedAsset)
  return projected
}
export function publicRelatedAsset(asset) { return (!asset || typeof asset !== 'object') ? asset : omitFields(asset, PRIVATE_ASSET_FIELDS) }
function omitFields(value, fields) {
  const output = {}
  for (const [key, fieldValue] of Object.entries(value || {})) if (!fields.has(key)) output[key] = fieldValue
  return output
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
}
