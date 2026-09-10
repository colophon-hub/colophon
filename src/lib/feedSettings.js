export const DEFAULT_FEED_SETTINGS = {
  feedsIntroTitle: 'Follow this publication',
  feedsIntroBody: `RSS feeds let readers, researchers, feed readers, podcast apps, librarians, mirror sites, and other tools follow new work without depending on a social platform algorithm.

The main feed follows everything published through the live feed system. Format feeds follow one kind of work, such as articles, comics, podcasts, newsletters, or print material. Project and collection feeds follow bodies of work. Topic and series feeds follow recurring subjects. Byline feeds follow public byline labels, not necessarily legal names.

Those labels are editorial metadata and can be changed. If an imported category is wrong, if a project name changes, if a contributor publishes under a collective name, or if a byline should not expose a real name, editors can rename or hide the feed term from the backend.

This is deliberately ordinary web infrastructure. It can be subscribed to, mirrored, archived, indexed, and preserved independently of a platform feed.`,
  feedBasePath: '/feeds',
  exposeMainFeed: true,
  exposeFormatFeeds: true,
  exposeProjectFeeds: true,
  exposeCollectionFeeds: true,
  exposeAuthorFeeds: true,
  exposeTopicFeeds: true,
  exposeSeriesFeeds: true,
  aliases: {
    author: {},
    format: {
      post: 'article',
      posts: 'article',
      audiozine: 'audio',
    },
    project: {},
    collection: {},
    topic: {},
    series: {},
  },
  hiddenTerms: {
    author: [],
    format: [],
    project: [],
    collection: [],
    topic: [],
    series: [],
  },
}

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_FEED_SETTINGS))
}

export function mergeFeedSettings(value = {}) {
  const defaults = cloneDefaults()
  const input = value && typeof value === 'object' ? value : {}
  return {
    ...defaults,
    ...input,
    aliases: {
      ...defaults.aliases,
      ...(input.aliases || {}),
      author: { ...defaults.aliases.author, ...(input.aliases?.author || {}) },
      format: { ...defaults.aliases.format, ...(input.aliases?.format || {}) },
      project: { ...defaults.aliases.project, ...(input.aliases?.project || {}) },
      collection: { ...defaults.aliases.collection, ...(input.aliases?.collection || {}) },
      topic: { ...defaults.aliases.topic, ...(input.aliases?.topic || {}) },
      series: { ...defaults.aliases.series, ...(input.aliases?.series || {}) },
    },
    hiddenTerms: {
      ...defaults.hiddenTerms,
      ...(input.hiddenTerms || {}),
      author: Array.isArray(input.hiddenTerms?.author) ? input.hiddenTerms.author : defaults.hiddenTerms.author,
      format: Array.isArray(input.hiddenTerms?.format) ? input.hiddenTerms.format : defaults.hiddenTerms.format,
      project: Array.isArray(input.hiddenTerms?.project) ? input.hiddenTerms.project : defaults.hiddenTerms.project,
      collection: Array.isArray(input.hiddenTerms?.collection) ? input.hiddenTerms.collection : defaults.hiddenTerms.collection,
      topic: Array.isArray(input.hiddenTerms?.topic) ? input.hiddenTerms.topic : defaults.hiddenTerms.topic,
      series: Array.isArray(input.hiddenTerms?.series) ? input.hiddenTerms.series : defaults.hiddenTerms.series,
    },
  }
}

export function loadFeedSettings() {
  return cloneDefaults()
}

export async function loadFeedSettingsAsync() {
  const response = await fetch('/api/feed-settings', {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1') {
    throw new Error(data?.error || `feed settings request failed: ${response.status}`)
  }
  return mergeFeedSettings(data.settings || {})
}

export async function saveFeedSettings(settings) {
  const next = mergeFeedSettings(settings)
  const response = await fetch('/api/feed-settings', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ settings: next }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1') {
    throw new Error(data?.error || `feed settings save failed: ${response.status}`)
  }
  return mergeFeedSettings(data.settings || next)
}

export async function resetFeedSettings() {
  const response = await fetch('/api/feed-settings', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok || data.mode !== 'd1') {
    throw new Error(data?.error || `feed settings reset failed: ${response.status}`)
  }
  return cloneDefaults()
}

export function normalizeFeedTerm(kind, value, settings = loadFeedSettings()) {
  const clean = String(value || '').trim()
  if (!clean) return ''
  const aliasMap = settings.aliases?.[kind] || {}
  const hidden = new Set((settings.hiddenTerms?.[kind] || []).map((term) => String(term).trim().toLowerCase()))
  const mapped = String(aliasMap[clean] || aliasMap[clean.toLowerCase()] || clean).trim()
  if (!mapped || hidden.has(clean.toLowerCase()) || hidden.has(mapped.toLowerCase())) return ''
  return mapped
}

export function slugifyFeedTerm(value = '') {
  return String(value || 'feed')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'feed'
}
