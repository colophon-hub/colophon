export const PUBLIC_NAVIGATION_MODULES = Object.freeze(['campaigns', 'investigations'])

export const DEFAULT_PUBLIC_NAVIGATION_ITEMS = Object.freeze([
  Object.freeze({ id: 'archive', label: 'Archive', href: '/archive', enabled: true, module: '' }),
  Object.freeze({ id: 'feeds', label: 'Feeds', href: '/feeds', enabled: true, module: '' }),
  Object.freeze({ id: 'about', label: 'About', href: '/about', enabled: true, module: '' }),
  Object.freeze({ id: 'investigations', label: 'Investigations', href: '/investigations', enabled: true, module: 'investigations' }),
  Object.freeze({ id: 'campaigns', label: 'Campaigns', href: '/campaigns', enabled: true, module: 'campaigns' }),
])

export function normalizePublicNavigation(input) {
  const rawItems = Array.isArray(input?.items) ? input.items : DEFAULT_PUBLIC_NAVIGATION_ITEMS
  const seen = new Set()
  const items = []
  for (let index = 0; index < rawItems.length && items.length < 24; index += 1) {
    const normalized = normalizeNavigationItem(rawItems[index], index)
    if (!normalized || seen.has(normalized.id)) continue
    seen.add(normalized.id)
    items.push(normalized)
  }
  return { items }
}

export function normalizeNavigationItem(input, index = 0) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const label = cleanText(input.label, 80)
  const href = normalizeNavigationHref(input.href)
  if (!label || !href) return null
  const requestedId = cleanId(input.id)
  const id = requestedId || `custom-${index + 1}`
  const module = PUBLIC_NAVIGATION_MODULES.includes(String(input.module || '').trim()) ? String(input.module).trim() : ''
  return { id, label, href, enabled: input.enabled !== false, module }
}

export function normalizeNavigationHref(value) {
  const href = String(value || '').trim().slice(0, 2000)
  if (!href) return ''
  if (href.startsWith('/') || href.startsWith('#')) return href
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href
  return ''
}

export function resolveVisibleNavigation(navigation, enabledModules = []) {
  const modules = new Set(Array.isArray(enabledModules) ? enabledModules : [])
  return normalizePublicNavigation(navigation).items.filter((item) => item.enabled && (!item.module || modules.has(item.module)))
}

export function makeCustomNavigationItem(existingItems = []) {
  const used = new Set((existingItems || []).map((item) => String(item?.id || '')))
  let index = 1
  let id = `custom-${index}`
  while (used.has(id)) { index += 1; id = `custom-${index}` }
  return { id, label: 'New link', href: '/', enabled: true, module: '' }
}

function cleanText(value, max) { return String(value || '').trim().slice(0, max) }
function cleanId(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) }
