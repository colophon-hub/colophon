export const CAMPAIGN_SCHEMA_VERSION = 6
export const CAMPAIGN_PUBLICATION_STATES = ['draft', 'published', 'archived']
export const CAMPAIGN_LIFECYCLE_STATES = ['active', 'inactive', 'completed', 'archived']
export const CAMPAIGN_MODERATION_STATES = ['automatic', 'featured', 'hidden']
export const CAMPAIGN_SECTION_KEYS = [
  'status', 'reporting', 'letters', 'act', 'graphics', 'updates', 'timeline',
  'coverage', 'sources', 'faq', 'translations', 'signatories', 'social',
  'donate', 'socialArchive', 'dispatches', 'questions', 'benefit',
]

export function normalizeCampaign(input = {}) {
  const now = new Date().toISOString()
  const title = String(input.title || 'Campaign')
  const slug = slugify(input.slug || title || input.id)
  const status = CAMPAIGN_PUBLICATION_STATES.includes(input.status) ? input.status : 'published'
  return {
    id: String(input.id || `campaign-${slug || randomId()}`),
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    slug,
    status,
    lifecycleStatus: normalizeLifecycle(input.lifecycleStatus, input.campaignStatus, status),
    campaignType: String(input.campaignType || 'advocacy'),
    kicker: String(input.kicker || ''),
    title,
    shortTitle: String(input.shortTitle || title),
    deck: String(input.deck || ''),
    summary: String(input.summary || ''),
    deadline: normalizeDate(input.deadline),
    deadlineTimeZone: normalizeTimeZone(input.deadlineTimeZone),
    heroImage: String(input.heroImage || ''),
    heroAlt: String(input.heroAlt || ''),
    monitorUrl: String(input.monitorUrl || ''),
    monitorLabel: String(input.monitorLabel || 'Infrastructure monitor'),
    partners: normalizeStrings(input.partners),
    campaignKeywords: normalizeStrings(input.campaignKeywords),
    disclaimer: String(input.disclaimer || ''),
    donation: normalizeDonation(input.donation),
    correspondence: normalizeCorrespondence(input.correspondence),
    actions: normalizeRows(input.actions, ['title', 'body', 'href', 'label']),
    updates: normalizeRows(input.updates, ['date', 'title', 'body', 'url'], { booleanFields: ['pinned'], moderated: true }),
    resources: normalizeRows(input.resources, ['type', 'title', 'description', 'href', 'label', 'imageUrl'], { moderated: true }),
    social: normalizeRows(input.social, ['platform', 'date', 'account', 'excerpt', 'url', 'imageUrl', 'language', 'languageCode'], { moderated: true }),
    graphics: normalizeRows(input.graphics, ['title', 'imageUrl', 'alt', 'caption', 'downloadUrl'], { moderated: true }),
    coverage: normalizeRows(input.coverage, ['date', 'outlet', 'title', 'translatedTitle', 'language', 'languageCode', 'url', 'summary'], { moderated: true }),
    signatories: normalizeRows(input.signatories, ['name', 'location', 'statement', 'url'], { moderated: true }),
    sources: normalizeRows(input.sources, ['title', 'publisher', 'url', 'note']),
    timeline: normalizeRows(input.timeline, ['date', 'title', 'body']),
    faq: normalizeRows(input.faq, ['question', 'answer']),
    translations: normalizeRows(input.translations, ['language', 'title', 'url']),
    sectionOrder: normalizeSectionOrder(input.sectionOrder),
    hiddenSections: normalizeSectionKeys(input.hiddenSections),
    sectionTitles: normalizeSectionTitles(input.sectionTitles),
    automation: normalizeAutomation(input.automation),
    createdAt: String(input.createdAt || now),
    updatedAt: String(input.updatedAt || now),
  }
}

export function visibleCampaignRows(rows = []) {
  return [...rows]
    .filter((row) => normalizeModeration(row?.moderationStatus || row?.moderation) !== 'hidden')
    .sort((a, b) => moderationRank(b) - moderationRank(a))
}

export function normalizeModeration(value) {
  const raw = String(value || 'automatic').toLowerCase()
  if (CAMPAIGN_MODERATION_STATES.includes(raw)) return raw
  if (['hide', 'hidden', 'rejected', 'suppressed'].includes(raw)) return 'hidden'
  if (['feature', 'featured', 'pinned', 'approved-featured'].includes(raw)) return 'featured'
  return 'automatic'
}

function moderationRank(row = {}) {
  const status = normalizeModeration(row?.moderationStatus || row?.moderation)
  return status === 'featured' ? 2 : status === 'automatic' ? 1 : 0
}

function normalizeLifecycle(current, legacy, publicationState) {
  const direct = String(current || '').toLowerCase()
  if (CAMPAIGN_LIFECYCLE_STATES.includes(direct)) return direct
  const old = String(legacy || '').toLowerCase()
  if (old === 'completed') return 'completed'
  if (old === 'archived') return 'archived'
  if (old === 'inactive') return 'inactive'
  if (publicationState === 'archived') return 'archived'
  return 'active'
}

function normalizeDonation(value) {
  const input = value && typeof value === 'object' ? value : {}
  return {
    url: String(input.url || ''), label: String(input.label || 'Donate'), platform: String(input.platform || ''),
    recipient: String(input.recipient || ''), explanation: String(input.explanation || ''), lastVerifiedAt: normalizeDate(input.lastVerifiedAt),
  }
}

function normalizeCorrespondence(value) {
  const input = value && typeof value === 'object' ? value : {}
  return {
    enabled: Boolean(input.enabled), publicQuestions: Boolean(input.publicQuestions),
    contributorLabel: String(input.contributorLabel || 'Field contributor'),
    editorLabel: String(input.editorLabel || 'Publication editor'),
    intro: String(input.intro || ''),
  }
}

function normalizeAutomation(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    enabled: Boolean(input.enabled), discoverNews: Boolean(input.discoverNews), startAt: normalizeDate(input.startAt),
    blueskyActors: normalizeStrings(input.blueskyActors).slice(0, 12), mastodonAccounts: normalizeStrings(input.mastodonAccounts).slice(0, 12),
    coverageFeeds: normalizeStrings(input.coverageFeeds).slice(0, 20), signatoriesUrl: String(input.signatoriesUrl || '').trim(),
  }
}

function normalizeRows(value, fields, options = {}) {
  const rows = Array.isArray(value) ? value : []
  const booleanFields = options.booleanFields || []
  return rows.map((row = {}) => {
    const next = { id: String(row.id || `row-${randomId()}`) }
    for (const field of fields) next[field] = String(row[field] || '')
    for (const field of booleanFields) next[field] = Boolean(row[field])
    if (options.moderated) next.moderationStatus = normalizeModeration(row.moderationStatus || row.moderation)
    return next
  })
}

function normalizeSectionOrder(value) {
  const requested = normalizeSectionKeys(value)
  return [...requested, ...CAMPAIGN_SECTION_KEYS.filter((key) => !requested.includes(key))]
}

function normalizeSectionKeys(value) {
  const values = Array.isArray(value) ? value : []
  return [...new Set(values.map((item) => String(item || '').trim()).filter((item) => CAMPAIGN_SECTION_KEYS.includes(item)))]
}

function normalizeSectionTitles(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(CAMPAIGN_SECTION_KEYS.map((key) => [key, String(input[key] || '')]).filter(([, title]) => title))
}

function normalizeStrings(value) {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

function normalizeDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const time = new Date(raw).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString() : raw
}

function normalizeTimeZone(value) {
  const zone = String(value || 'UTC').trim()
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); return zone } catch { return 'UTC' }
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)
}
