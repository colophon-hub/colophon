const STANDALONE_RUNTIME = Object.freeze({
  mode: 'standalone',
  embedded: false,
  routeBase: '',
  apiBase: '/api',
  session: null,
  adapter: null,
})

const COLOPHON_API_ROOTS = Object.freeze([
  'account-security',
  'analytics',
  'audiolab',
  'audit-log',
  'backup-status',
  'campaign-',
  'campaigns',
  'collections',
  'course-',
  'editor-roles',
  'feed-',
  'investigations',
  'login',
  'logout',
  'media-assets',
  'native-content',
  'native-content-revisions',
  'native-content-sources',
  'native-translations',
  'podcast',
  'public-config',
  'session',
  'site-health',
  'system-backup',
  'taxonomy',
  'users',
])

let runtime = { ...STANDALONE_RUNTIME }
let originalFetch = null
let fetchBridgeInstalled = false

function normalizeBase(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === '/') return ''
  return `/${raw.replace(/^\/+|\/+$/g, '')}`
}

function shouldProxyApiPath(pathname) {
  if (!pathname.startsWith('/api/')) return false

  const endpoint = pathname.slice('/api/'.length)
  return COLOPHON_API_ROOTS.some((root) => endpoint === root || endpoint.startsWith(`${root}/`) || endpoint.startsWith(root))
}

function rewriteHostedApiRequest(input) {
  if (!runtime.embedded || !runtime.apiBase || typeof window === 'undefined') return input

  const rawUrl = input instanceof Request ? input.url : String(input || '')
  const url = new URL(rawUrl, window.location.origin)

  if (url.origin !== window.location.origin || !shouldProxyApiPath(url.pathname)) return input

  const suffix = url.pathname.replace(/^\/api\/?/, '')
  const base = normalizeBase(runtime.apiBase)
  url.pathname = `${base}/${suffix}`.replace(/\/{2,}/g, '/')

  if (input instanceof Request) {
    return new Request(url.toString(), input)
  }

  return url.toString()
}

function installEmbeddedFetchBridge() {
  if (fetchBridgeInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') return

  originalFetch = window.fetch.bind(window)
  window.fetch = (input, init) => originalFetch(rewriteHostedApiRequest(input), init)
  fetchBridgeInstalled = true
}

function removeEmbeddedFetchBridge() {
  if (!fetchBridgeInstalled || typeof window === 'undefined' || !originalFetch) return
  window.fetch = originalFetch
  originalFetch = null
  fetchBridgeInstalled = false
}

export function configureColophonHostRuntime({
  host = null,
  adapter = null,
  session = null,
  embedded = false,
} = {}) {
  const normalizedHost = host || {}
  const isEmbedded = Boolean(
    embedded
    || normalizedHost.embedded
    || normalizedHost.mode === 'bondfire'
    || normalizedHost.standalone === false
  )

  runtime = {
    mode: isEmbedded ? (normalizedHost.mode || 'hosted') : 'standalone',
    embedded: isEmbedded,
    routeBase: isEmbedded ? normalizeBase(normalizedHost.routeBase) : '',
    apiBase: isEmbedded ? normalizeBase(normalizedHost.apiBase || '/api') : '/api',
    session: isEmbedded ? (session || normalizedHost.session || null) : null,
    adapter: isEmbedded ? (adapter || normalizedHost.adapter || null) : null,
  }

  if (isEmbedded) installEmbeddedFetchBridge()
  else removeEmbeddedFetchBridge()

  return runtime
}

export function resetColophonHostRuntime() {
  runtime = { ...STANDALONE_RUNTIME }
  removeEmbeddedFetchBridge()
}

export function getColophonHostRuntime() {
  return runtime
}
