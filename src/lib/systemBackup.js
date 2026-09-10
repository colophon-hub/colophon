import { fetchNativeEntries, fetchNativeRevisions } from './nativePublicContentApi.js'
import { fetchTaxonomyTerms } from './taxonomyApi.js'
import { fetchEditorRoles, fetchAuditLog } from './editorRolesApi.js'
import { fetchMediaAssets } from './mediaAssetsApi.js'
import { loadPublicConfigPayload } from './publicConfigApi.js'

export async function collectSystemSnapshot(loaders = {}) {
  const loadNative = loaders.fetchNativeEntries || fetchNativeEntries
  const loadRevisions = loaders.fetchNativeRevisions || fetchNativeRevisions
  const loadTaxonomy = loaders.fetchTaxonomyTerms || fetchTaxonomyTerms
  const loadRoles = loaders.fetchEditorRoles || fetchEditorRoles
  const loadAudit = loaders.fetchAuditLog || fetchAuditLog
  const loadMedia = loaders.fetchMediaAssets || fetchMediaAssets
  const loadPublicConfig = loaders.loadPublicConfigPayload || loadPublicConfigPayload
  const loadCollections = loaders.fetchCollections || fetchCollectionsForBackup
  const loadCampaigns = loaders.fetchCampaigns || fetchCampaignsForBackup
  const loadCampaignRevisions = loaders.fetchCampaignRevisions || fetchCampaignRevisionsForBackup
  const loadCampaignCoverage = loaders.fetchCampaignCoverage || fetchCampaignCoverageForBackup
  const loadInvestigations = loaders.fetchInvestigations || fetchInvestigationsForBackup
  const loadInvestigationRevisions = loaders.fetchInvestigationRevisions || fetchInvestigationRevisionsForBackup
  const loadPublications = loaders.fetchPublications || fetchPublicationsForBackup
  const loadSites = loaders.fetchSites || fetchSitesForBackup
  const loadFeedSettings = loaders.fetchFeedSettings || fetchFeedSettingsForBackup
  const loadPodcastSettings = loaders.fetchPodcastSettings || fetchPodcastSettingsForBackup
  const loadAdminUsers = loaders.fetchAdminUsers || fetchAdminUsersForBackup

  const [
    nativeData,
    taxonomyData,
    rolesData,
    auditData,
    mediaData,
    collectionsData,
    campaignsData,
    campaignRevisionsData,
    campaignCoverageData,
    investigationsData,
    investigationRevisionsData,
    publicationsData,
    publicConfigData,
    sitesData,
    feedSettingsData,
    podcastSettingsData,
    adminUsersData,
  ] = await Promise.all([
    loadNative({ includeFuture: 1 }),
    loadTaxonomy(),
    loadRoles(),
    loadAudit(),
    loadMedia(),
    loadCollections(),
    loadCampaigns(),
    loadCampaignRevisions(),
    loadCampaignCoverage(),
    loadInvestigations(),
    loadInvestigationRevisions(),
    loadPublications(),
    loadPublicConfig(),
    loadSites(),
    loadFeedSettings(),
    loadPodcastSettings(),
    loadAdminUsers(),
  ])

  const nativeItems = requireItems(nativeData, 'native content')
  const taxonomyTerms = requireItems(taxonomyData, 'taxonomy')
  const editorRoles = requireItems(rolesData, 'editor roles')
  const auditLog = requireItems(auditData, 'audit log')
  const mediaAssets = requireItems(mediaData, 'media assets')
  const collections = requireItems(collectionsData, 'collections')
  const campaigns = requireItems(campaignsData, 'campaigns')
  const campaignRevisions = requireItems(campaignRevisionsData, 'campaign revisions')
  const campaignCoverage = requireItems(campaignCoverageData, 'campaign coverage archive')
  const investigations = requireItems(investigationsData, 'investigations')
  const investigationRevisions = requireItems(investigationRevisionsData, 'investigation revisions')
  const publications = requireItems(publicationsData, 'publications')
  const sites = requireItems(sitesData, 'sites')
  const adminUsers = requireItems(adminUsersData, 'admin users').map(sanitizeUserForBackup)
  const feedSettings = requireSettingsPayload(feedSettingsData, 'feed settings')
  const podcastSettings = requireSettingsPayload(podcastSettingsData, 'podcast settings')
  const publicSiteConfig = requireObject(
    publicConfigData?.config || publicConfigData?.settings || publicConfigData?.payload || publicConfigData,
    'public site config',
  )
  const revisionsByNativeId = {}

  for (const item of nativeItems) {
    const revData = await loadRevisions({ nativeId: item.id })
    revisionsByNativeId[item.id] = requireItems(revData, `revisions for ${item.id}`)
  }

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 9,
    backupType: 'server-system',
    source: 'BF_DB-backed APIs',
    manifest: {
      complete: true,
      credentialMaterialExcluded: true,
      datasets: [
        'nativeContent',
        'revisionsByNativeId',
        'taxonomyTerms',
        'adminUsers',
        'editorRoles',
        'auditLog',
        'mediaAssets',
        'collections',
        'campaigns',
        'campaignRevisions',
        'campaignCoverage',
        'investigations',
        'investigationRevisions',
        'publications',
        'sites',
        'feedSettings',
        'podcastSettings',
        'publicSiteConfig',
      ],
    },
    nativeContent: nativeItems,
    revisionsByNativeId,
    taxonomyTerms,
    adminUsers,
    editorRoles,
    auditLog,
    mediaAssets,
    collections,
    campaigns,
    campaignRevisions,
    campaignCoverage,
    investigations,
    investigationRevisions,
    publications,
    sites,
    feedSettings,
    podcastSettings,
    publicSiteConfig,
  }
}

export async function exportSystemSnapshot() {
  return collectSystemSnapshot()
}

export function summarizeSnapshot(snapshot) {
  const data = snapshot || {}
  return {
    nativeCount: Array.isArray(data.nativeContent) ? data.nativeContent.length : 0,
    revisionCount: Object.values(data.revisionsByNativeId || {}).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0,
    ),
    taxonomyCount: Array.isArray(data.taxonomyTerms) ? data.taxonomyTerms.length : 0,
    userCount: Array.isArray(data.adminUsers) ? data.adminUsers.length : 0,
    roleCount: Array.isArray(data.editorRoles) ? data.editorRoles.length : 0,
    auditCount: Array.isArray(data.auditLog) ? data.auditLog.length : 0,
    mediaCount: Array.isArray(data.mediaAssets) ? data.mediaAssets.length : 0,
    collectionCount: Array.isArray(data.collections) ? data.collections.length : 0,
    campaignCount: Array.isArray(data.campaigns) ? data.campaigns.length : 0,
    campaignRevisionCount: Array.isArray(data.campaignRevisions) ? data.campaignRevisions.length : 0,
    campaignCoverageCount: Array.isArray(data.campaignCoverage) ? data.campaignCoverage.length : 0,
    investigationCount: Array.isArray(data.investigations) ? data.investigations.length : 0,
    investigationRevisionCount: Array.isArray(data.investigationRevisions) ? data.investigationRevisions.length : 0,
    publicationCount: Array.isArray(data.publications) ? data.publications.length : 0,
    siteCount: Array.isArray(data.sites) ? data.sites.length : 0,
    feedSettingsIncluded: Boolean(data.feedSettings && typeof data.feedSettings === 'object'),
    podcastSettingsIncluded: Boolean(data.podcastSettings && typeof data.podcastSettings === 'object'),
    publicConfigIncluded: Boolean(data.publicSiteConfig && typeof data.publicSiteConfig === 'object'),
    complete: data?.manifest?.complete === true,
  }
}

export function downloadSnapshot(snapshot) {
  if (snapshot?.manifest?.complete !== true) throw new Error('Refusing to download an incomplete system snapshot')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `colophon-system-snapshot-${stamp}.json`
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function sanitizeUserForBackup(user = {}) {
  return {
    id: String(user.id || ''),
    email: String(user.email || ''),
    displayName: String(user.displayName || ''),
    role: String(user.role || ''),
    status: String(user.status || ''),
    createdAt: String(user.createdAt || ''),
    updatedAt: String(user.updatedAt || ''),
    lastLoginAt: String(user.lastLoginAt || ''),
  }
}

function requireItems(data, label) {
  if (!data?.ok || data.mode === 'scaffold' || data.mode === 'unavailable' || !Array.isArray(data.items)) {
    throw new Error(`${label} backup response was incomplete`)
  }
  return data.items
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} backup response was incomplete`)
  return value
}

function requireSettingsPayload(data, label) {
  if (!data?.ok || data.mode !== 'd1' || !Object.prototype.hasOwnProperty.call(data, 'settings')) {
    throw new Error(`${label} backup response was incomplete`)
  }
  if (data.settings == null) return {}
  return requireObject(data.settings, label)
}

async function fetchCollectionsForBackup() {
  return fetchRequiredList('/api/collections?includeDrafts=1', 'collections')
}

async function fetchCampaignsForBackup() {
  return fetchRequiredList('/api/campaigns?includeDrafts=1', 'campaigns')
}

async function fetchCampaignRevisionsForBackup() {
  return fetchPagedList('/api/campaign-revisions?all=1&limit=500', 'campaign revisions', 10000)
}

async function fetchCampaignCoverageForBackup() {
  return fetchPagedList('/api/campaign-coverage?admin=1&editorialStatus=all&limit=500', 'campaign coverage archive', 1000)
}

async function fetchInvestigationsForBackup() {
  return fetchRequiredList('/api/investigations?includeDrafts=1', 'investigations')
}

async function fetchInvestigationRevisionsForBackup() {
  return fetchPagedList('/api/investigation-revisions?all=1&limit=500', 'investigation revisions', 10000)
}

async function fetchPagedList(baseUrl, label, pageLimit) {
  const items = []
  let page = 1
  let pages = 1
  do {
    const separator = baseUrl.includes('?') ? '&' : '?'
    const data = await fetchRequiredList(`${baseUrl}${separator}page=${page}`, label)
    items.push(...data.items)
    pages = Math.max(1, Number(data.pages || 1))
    page += 1
    if (page > pageLimit) throw new Error(`${label} backup exceeded the safe page limit`)
  } while (page <= pages)
  return { ok: true, mode: 'd1', items }
}

async function fetchPublicationsForBackup() {
  return fetchRequiredList('/api/publications?includeDrafts=1', 'publications')
}

async function fetchSitesForBackup() {
  return fetchRequiredList('/api/sites', 'sites')
}

async function fetchAdminUsersForBackup() {
  return fetchRequiredList('/api/users', 'admin users')
}

async function fetchFeedSettingsForBackup() {
  return fetchRequiredSettings('/api/feed-settings', 'feed settings')
}

async function fetchPodcastSettingsForBackup() {
  return fetchRequiredSettings('/api/podcast-settings', 'podcast settings')
}

async function fetchRequiredSettings(url, label) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' } })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1' || !Object.prototype.hasOwnProperty.call(data, 'settings')) {
    throw new Error(data?.error || `${label} backup request failed: ${response.status}`)
  }
  if (data.settings != null && (typeof data.settings !== 'object' || Array.isArray(data.settings))) {
    throw new Error(`${label} backup response contained invalid settings data`)
  }
  return data
}

async function fetchRequiredList(url, label) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' } })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode === 'scaffold' || data.mode === 'unavailable' || !Array.isArray(data.items)) {
    throw new Error(data?.error || `${label} backup fetch failed: ${response.status}`)
  }
  return data
}
