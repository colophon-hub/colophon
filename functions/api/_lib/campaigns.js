import { CAMPAIGN_SECTION_KEYS, normalizeCampaign, visibleCampaignRows } from '../../../shared/campaignModel.js'

export { CAMPAIGN_SECTION_KEYS, normalizeCampaign }

export async function ensureCampaignsTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, campaign_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', title TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_updated_at ON campaigns(updated_at DESC)').run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaign_revisions (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, revision_json TEXT NOT NULL, revision_note TEXT NOT NULL DEFAULT 'save', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_revisions_campaign_id ON campaign_revisions(campaign_id, created_at DESC)').run()
}

export async function ensureDefaultCampaigns(db) { await ensureCampaignsTable(db); return [] }

export async function listCampaigns(db, { includeDrafts = false } = {}) {
  await ensureCampaignsTable(db)
  const where = includeDrafts ? '' : "WHERE status = 'published'"
  const result = await db.prepare(`SELECT id, slug, campaign_json, status, title, created_at, updated_at FROM campaigns ${where} ORDER BY updated_at DESC`).all()
  return (Array.isArray(result?.results) ? result.results : []).map(rowToCampaign)
}

export async function getCampaign(db, idOrSlug) {
  await ensureCampaignsTable(db)
  const row = await db.prepare(`SELECT id, slug, campaign_json, status, title, created_at, updated_at FROM campaigns WHERE id = ? OR slug = ? LIMIT 1`).bind(idOrSlug, idOrSlug).first()
  return row ? rowToCampaign(row) : null
}

export async function upsertCampaign(db, campaign) {
  await ensureCampaignsTable(db)
  const normalized = normalizeCampaign({ ...campaign, updatedAt: new Date().toISOString() })
  await db.prepare(`INSERT INTO campaigns (id, slug, campaign_json, status, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, campaign_json = excluded.campaign_json, status = excluded.status, title = excluded.title, updated_at = excluded.updated_at`).bind(normalized.id, normalized.slug, JSON.stringify(normalized), normalized.status, normalized.title, normalized.createdAt, normalized.updatedAt).run()
  return normalized
}

export async function deleteCampaign(db, idOrSlug) {
  await ensureCampaignsTable(db)
  const existing = await getCampaign(db, idOrSlug)
  if (!existing) return null
  await db.prepare('DELETE FROM campaign_revisions WHERE campaign_id = ?').bind(existing.id).run()
  await db.prepare('DELETE FROM campaigns WHERE id = ?').bind(existing.id).run()
  return existing
}

export async function saveCampaignRevision(db, campaign, revisionNote = 'save') {
  await ensureCampaignsTable(db)
  const normalized = normalizeCampaign(campaign)
  const id = `campaign-revision-${randomId()}`
  const createdAt = new Date().toISOString()
  await db.prepare(`INSERT INTO campaign_revisions (id, campaign_id, revision_json, revision_note, created_at) VALUES (?, ?, ?, ?, ?)`).bind(id, normalized.id, JSON.stringify(normalized), String(revisionNote || 'save'), createdAt).run()
  return { id, campaignId: normalized.id, revisionNote: String(revisionNote || 'save'), createdAt, campaign: normalized }
}

export async function listCampaignRevisions(db, campaignId, limit = 30) {
  await ensureCampaignsTable(db)
  const result = await db.prepare(`SELECT id, campaign_id, revision_json, revision_note, created_at FROM campaign_revisions WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ?`).bind(String(campaignId || ''), Math.max(1, Math.min(100, Number(limit) || 30))).all()
  return (Array.isArray(result?.results) ? result.results : []).map(revisionRow)
}

export async function listAllCampaignRevisions(db, { limit = 500, page = 1 } = {}) {
  await ensureCampaignsTable(db)
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 500))
  const safePage = Math.max(1, Number(page) || 1)
  const countRow = await db.prepare('SELECT COUNT(*) AS total FROM campaign_revisions').first()
  const total = Number(countRow?.total || 0)
  const result = await db.prepare(`SELECT id, campaign_id, revision_json, revision_note, created_at FROM campaign_revisions ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(safeLimit, (safePage - 1) * safeLimit).all()
  return { items: (Array.isArray(result?.results) ? result.results : []).map(revisionRow), total, page: safePage, pages: Math.max(1, Math.ceil(total / safeLimit)), limit: safeLimit }
}

export async function restoreCampaignRevision(db, revisionId) {
  await ensureCampaignsTable(db)
  const row = await db.prepare(`SELECT id, campaign_id, revision_json, revision_note, created_at FROM campaign_revisions WHERE id = ? LIMIT 1`).bind(String(revisionId || '')).first()
  if (!row) throw new Error('campaign revision not found')
  const revision = revisionRow(row)
  const current = await getCampaign(db, revision.campaignId)
  if (current) await saveCampaignRevision(db, current, `before:restore:${revision.id}`)
  const restored = await upsertCampaign(db, { ...revision.campaign, id: revision.campaignId })
  await saveCampaignRevision(db, restored, `restore:${revision.id}`)
  return restored
}

export function buildCampaignRssXml({ campaign, requestUrl, dispatches = [] }) {
  const origin = new URL(requestUrl).origin
  const pageUrl = `${origin}/campaigns/${encodeURIComponent(campaign.slug)}`
  const selfUrl = `${origin}/feeds/campaigns/${encodeURIComponent(campaign.slug)}.xml`
  const items = [...visibleCampaignRows(campaign.updates || []), ...dispatches.map((item) => ({ id: `dispatch-${item.id}`, date: item.createdAt, title: item.displayName ? `Dispatch from ${item.displayName}` : 'Field dispatch', body: item.body || (item.mediaType ? `${item.mediaType} dispatch` : ''), url: `${pageUrl}#dispatches`, mediaUrl: item.mediaUrl, mediaType: item.mediaType }))].filter((item) => item.title || item.body).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  const xmlItems = items.map((item) => {
    const link = item.url ? absoluteUrl(item.url, origin) : `${pageUrl}#updates`
    const enclosure = item.mediaUrl && ['audio', 'video'].includes(item.mediaType) ? `\n      <enclosure url="${xml(item.mediaUrl)}" type="${item.mediaType === 'audio' ? 'audio/webm' : 'video/webm'}" />` : ''
    return `    <item>\n      <title>${xml(item.title || 'Campaign update')}</title>\n      <link>${xml(link)}</link>\n      <guid isPermaLink="false">${xml(`${campaign.slug}:${item.id}`)}</guid>\n      <pubDate>${xml(validRssDate(item.date || campaign.updatedAt))}</pubDate>\n      <description>${xml(item.body || '')}</description>${enclosure}\n    </item>`
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${xml(`${campaign.shortTitle || campaign.title} — Campaign Updates`)}</title>\n    <link>${xml(pageUrl)}</link>\n    <description>${xml(campaign.deck || campaign.summary || campaign.title)}</description>\n    <language>en</language>\n    <atom:link href="${xml(selfUrl)}" rel="self" type="application/rss+xml" />\n    <lastBuildDate>${xml(validRssDate(campaign.updatedAt))}</lastBuildDate>\n${xmlItems}\n  </channel>\n</rss>`
}

function rowToCampaign(row) { let parsed = {}; try { parsed = JSON.parse(row.campaign_json || '{}') } catch {} return normalizeCampaign({ ...parsed, id: row.id, slug: row.slug, status: row.status, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at }) }
function revisionRow(row) { let parsed = {}; try { parsed = JSON.parse(row.revision_json || '{}') } catch {} return { id: String(row.id || ''), campaignId: String(row.campaign_id || ''), revisionNote: String(row.revision_note || 'save'), createdAt: String(row.created_at || ''), campaign: normalizeCampaign({ ...parsed, id: row.campaign_id }) } }
function validRssDate(value) { const date = new Date(value || Date.now()); return Number.isFinite(date.getTime()) ? date.toUTCString() : new Date().toUTCString() }
function absoluteUrl(value, origin) { try { return new URL(String(value || ''), origin).toString() } catch { return origin } }
function xml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') }
function randomId() { return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10) }
