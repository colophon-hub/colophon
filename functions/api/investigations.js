import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { writeAuditLog, inferActorFromRequest } from './_lib/auditLog.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import {
  deleteInvestigation,
  getInvestigation,
  listInvestigations,
  saveInvestigationRevision,
  upsertInvestigation,
} from './_lib/investigations.js'
import { normalizeInvestigation, publicInvestigation } from '../../shared/investigationModel.js'

export async function onRequestOptions(context) {
  const permission = await resolvePublicSitePermission(context)
  return json({ ok: true, canEdit: permission.canEdit, authMode: permission.mode, mode: getBoundDb(context) ? 'd1' : 'unavailable' })
}

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('investigation reads')
    const permission = await resolvePublicSitePermission(context)
    const url = new URL(context.request.url)
    const slug = String(url.searchParams.get('slug') || '')
    const id = String(url.searchParams.get('id') || '')
    const includeDrafts = permission.canEdit && url.searchParams.get('includeDrafts') === '1'
    if (slug || id) {
      const item = await getInvestigation(db, slug || id)
      if (!item || (!includeDrafts && item.publicationStatus !== 'published')) return json({ ok: true, mode: 'd1', item: null })
      return json({ ok: true, mode: 'd1', item: includeDrafts ? item : publicInvestigation(item) })
    }
    const items = await listInvestigations(db, { includeDrafts })
    return json({ ok: true, mode: 'd1', items: includeDrafts ? items : items.map(publicInvestigation) })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

export async function onRequestPost(context) { return handleWrite(context) }
export async function onRequestPut(context) { return handleWrite(context) }

export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'authentication required', canEdit: false }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('investigation deletes')
    const body = await context.request.json().catch(() => ({}))
    const key = String(body?.id || body?.slug || '')
    if (!key) return json({ ok: false, error: 'missing investigation id' }, 400)
    const removed = await deleteInvestigation(db, key)
    if (!removed) return json({ ok: false, error: 'investigation not found' }, 404)
    await writeAuditLog(db, {
      action: 'investigations.delete', entityType: 'investigation', entityId: removed.id,
      actor: inferActorFromRequest(context.request), detail: { slug: removed.slug, title: removed.title },
    })
    return json({ ok: true, mode: 'd1', removed: { id: removed.id, slug: removed.slug } })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

async function handleWrite(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'authentication required', canEdit: false }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('investigation writes')
    const body = await context.request.json()
    const incoming = body?.item || body || {}
    const item = normalizeInvestigation(incoming)
    if (!item.title) return json({ ok: false, error: 'missing investigation title' }, 400)
    if (!item.slug) return json({ ok: false, error: 'missing investigation slug' }, 400)

    const existing = await getInvestigation(db, item.id)
    if (existing) await saveInvestigationRevision(db, existing, 'before:save')
    const saved = await upsertInvestigation(db, item)
    await saveInvestigationRevision(db, saved, String(body?.revisionNote || 'save'))
    await writeAuditLog(db, {
      action: 'investigations.upsert', entityType: 'investigation', entityId: saved.id,
      actor: inferActorFromRequest(context.request),
      detail: {
        slug: saved.slug, status: saved.status, publicationStatus: saved.publicationStatus,
        sources: saved.sources.length, timelineEvents: saved.timeline.length, recordsRequests: saved.recordsRequests.length,
      },
    })
    return json({ ok: true, mode: 'd1', item: saved })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
