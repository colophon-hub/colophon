import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { accountIdForPermission, isContributor } from './_lib/editorialWorkflow.js'
import { ensureMediaAssetsTable, listMediaAssets, upsertMediaAsset, deleteMediaAsset } from './_lib/mediaAssets.js'
import { writeAuditLog } from './_lib/auditLog.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({ ok: true, canEdit: permissionHasCapability(permission, 'media:write'), authMode: permission.mode, authReason: permission.reason, mode: getBoundDb(context) ? 'd1' : 'unavailable' })
}
export async function onRequestGet(context) {
  try { const url = new URL(context.request.url); const db = getBoundDb(context); if (!db) return databaseUnavailable('media asset reads'); await ensureMediaAssetsTable(db); const items = await listMediaAssets(db, { mediaType: url.searchParams.get('mediaType') || undefined }); return json({ ok: true, mode: 'd1', items }) } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 500) }
}
export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'media:write')) return json({ ok: false, error: 'media:write permission required' }, 403)
    const body = await context.request.json(); const asset = { ...(body?.asset || body || {}) }; const db = getBoundDb(context)
    if (!db) return databaseUnavailable('media asset writes')
    const all = await listMediaAssets(db); const existing = asset.id ? all.find((item) => item.id === asset.id) : null
    if (isContributor(permission)) {
      const userId = accountIdForPermission(permission)
      if (!userId) return json({ ok: false, error: 'contributor identity is required' }, 403)
      if (existing && existing.contributorId !== userId) return json({ ok: false, error: 'contributors can only edit media they uploaded' }, 403)
      asset.contributorId = userId
    }
    const saved = await upsertMediaAsset(db, asset)
    await writeAuditLog(db, { action: 'media.asset.upsert', entityType: 'media_asset', entityId: saved.id, actor: permission.actor, detail: { title: saved.title, url: saved.url, mediaType: saved.mediaType, filename: saved.filename, source: saved.source, contributorId: saved.contributorId || '' } })
    return json({ ok: true, mode: 'd1', asset: saved })
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 400) }
}
export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permissionHasCapability(permission, 'media:write')) return json({ ok: false, error: 'media:write permission required' }, 403)
    const id = new URL(context.request.url).searchParams.get('id') || ''; if (!id) return json({ ok: false, error: 'missing id' }, 400)
    const db = getBoundDb(context); if (!db) return databaseUnavailable('media asset deletion')
    const items = await listMediaAssets(db); const existing = items.find((item) => item.id === id) || null
    if (isContributor(permission) && (!existing || existing.contributorId !== accountIdForPermission(permission))) return json({ ok: false, error: 'contributors can only delete media they uploaded' }, 403)
    const result = await deleteMediaAsset(db, id)
    await writeAuditLog(db, { action: 'media.asset.delete', entityType: 'media_asset', entityId: id, actor: permission.actor, detail: existing ? { title: existing.title, url: existing.url, storageKey: existing.storageKey, contributorId: existing.contributorId || '' } : { id } })
    return json({ ok: true, mode: 'd1', ...result })
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 500) }
}
function json(data, status = 200) { return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }) }
