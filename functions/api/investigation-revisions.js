import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { ensureInvestigationTables } from './_lib/investigations.js'

export async function onRequestGet(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'authentication required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('investigation revision reads')
    await ensureInvestigationTables(db)

    const url = new URL(context.request.url)
    const all = url.searchParams.get('all') === '1'
    const investigationId = String(url.searchParams.get('investigationId') || '').trim()
    if (!all && !investigationId) return json({ ok: false, error: 'missing investigationId' }, 400)

    const limit = clampInt(url.searchParams.get('limit'), 1, 500, 100)
    const page = clampInt(url.searchParams.get('page'), 1, 10000, 1)
    const offset = (page - 1) * limit
    const where = all ? '' : 'WHERE investigation_id = ?'
    const countStatement = db.prepare(`SELECT COUNT(*) AS count FROM investigation_revisions ${where}`)
    const pageStatement = db.prepare(`SELECT id, investigation_id, revision_json, revision_note, created_at
      FROM investigation_revisions ${where} ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?`)

    const countRow = all
      ? await countStatement.first()
      : await countStatement.bind(investigationId).first()
    const result = all
      ? await pageStatement.bind(limit, offset).all()
      : await pageStatement.bind(investigationId, limit, offset).all()
    const total = Math.max(0, Number(countRow?.count || 0))
    const items = (Array.isArray(result?.results) ? result.results : []).map(rowToRevision)

    return json({
      ok: true,
      mode: 'd1',
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500)
  }
}

function rowToRevision(row = {}) {
  return {
    id: String(row.id || ''),
    investigationId: String(row.investigation_id || ''),
    snapshot: parseJson(row.revision_json, {}),
    revisionNote: String(row.revision_note || ''),
    createdAt: String(row.created_at || ''),
  }
}

function parseJson(value, fallback) {
  try { return JSON.parse(value) } catch { return fallback }
}

function clampInt(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
