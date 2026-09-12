import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { inferActorFromRequest, writeAuditLog } from './_lib/auditLog.js'
import { loadCampaignAutomation } from './_lib/campaignAutomation.js'
import { getCampaign } from './_lib/campaigns.js'
import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import {
  COVERAGE_EDITORIAL_STATUSES,
  ensureCampaignCoverageArchiveTables,
  getCampaignCoverageArchiveSummary,
  listCampaignCoverageArchive,
  updateCoverageEditorialState,
  upsertCampaignCoverageItems,
} from './_lib/campaignCoverageArchive.js'

const DEFAULT_CAMPAIGN_SLUG = 'example-campaign'

export async function onRequestOptions() {
  return json({ ok: true, mode: 'd1', methods: ['GET', 'PATCH'] })
}

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign coverage archive reads')
    const url = new URL(context.request.url)
    const campaignSlug = String(url.searchParams.get('campaign') || url.searchParams.get('slug') || DEFAULT_CAMPAIGN_SLUG).trim()
    const campaign = await getCampaign(db, campaignSlug)
    if (!campaign || campaign.status !== 'published') return json({ ok: false, error: 'campaign not found' }, 404)
    const adminView = url.searchParams.get('admin') === '1'
    let permission = null
    if (adminView) {
      permission = await resolvePublicSitePermission(context)
      if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'authentication required', canEdit: false }, 403, true)
    }

    await ensureCampaignCoverageArchiveTables(db)
    let summary = await getCampaignCoverageArchiveSummary(db, campaign.slug, { includeHidden: adminView })
    const forceRefresh = url.searchParams.get('refresh') === '1'
    if (summary.total === 0 || forceRefresh) {
      await refreshCampaignCoverageArchive(db, campaign, context.request.url)
      summary = await getCampaignCoverageArchiveSummary(db, campaign.slug, { includeHidden: adminView })
    } else if (campaign.automation?.enabled) {
      const refreshPromise = refreshCampaignCoverageArchive(db, campaign, context.request.url)
      if (typeof context.waitUntil === 'function') context.waitUntil(refreshPromise.catch(() => {}))
      else refreshPromise.catch(() => {})
    }

    const archive = await listCampaignCoverageArchive(db, {
      campaignSlug: campaign.slug,
      q: url.searchParams.get('q'),
      language: url.searchParams.get('language'),
      outlet: url.searchParams.get('outlet'),
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
      includeHidden: adminView,
      editorialStatus: adminView ? url.searchParams.get('editorialStatus') : '',
    })
    return json({ ok: true, mode: 'd1', ...archive, facets: { languages: summary.languages, outlets: summary.outlets }, lastUpdatedAt: summary.lastUpdatedAt }, 200, adminView)
  } catch (error) {
    const message = String(error?.message || error)
    return json({ ok: false, error: message }, /invalid editorial status/i.test(message) ? 400 : 500, true)
  }
}

export async function onRequestPatch(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: permission.reason || 'authentication required', canEdit: false }, 403, true)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign coverage editorial writes')
    const body = await context.request.json().catch(() => ({}))
    const id = String(body?.id || '').trim()
    const campaignSlug = String(body?.campaign || body?.campaignSlug || '').trim()
    const editorialStatus = String(body?.editorialStatus || '').trim().toLowerCase()
    if (!id || !campaignSlug) return json({ ok: false, error: 'coverage id and campaign are required' }, 400, true)
    if (!COVERAGE_EDITORIAL_STATUSES.includes(editorialStatus)) return json({ ok: false, error: 'editorialStatus must be automatic, featured, or hidden' }, 400, true)
    const campaign = await getCampaign(db, campaignSlug)
    if (!campaign) return json({ ok: false, error: 'campaign not found' }, 404, true)
    const actor = permission.actor || inferActorFromRequest(context.request)
    const item = await updateCoverageEditorialState(db, { id, campaignSlug: campaign.slug, editorialStatus, editorialNote: body?.editorialNote, actor })
    if (!item) return json({ ok: false, error: 'coverage item not found' }, 404, true)
    await writeAuditLog(db, {
      action: 'campaign-coverage.editorial-update', entityType: 'campaign-coverage', entityId: item.id,
      actor, detail: { campaignSlug: campaign.slug, editorialStatus, hasEditorialNote: Boolean(item.editorialNote) },
    })
    return json({ ok: true, mode: 'd1', item }, 200, true)
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400, true)
  }
}

async function refreshCampaignCoverageArchive(db, campaign, requestUrl) {
  await upsertCampaignCoverageItems(db, campaign.coverage || [], { campaignSlug: campaign.slug, source: 'campaign' })
  if (!campaign.automation?.enabled) return
  const automation = await loadCampaignAutomation(campaign, requestUrl)
  await upsertCampaignCoverageItems(db, automation.coverage || [], { campaignSlug: campaign.slug, source: 'campaign-automation' })
}

function json(data, status = 200, privateResponse = false) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': privateResponse ? 'no-store' : 'public, max-age=60, s-maxage=120' },
  })
}
