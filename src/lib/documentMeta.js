const DEFAULT_SITE_NAME = 'Independent Publication'
const DEFAULT_DESCRIPTION = 'Independent publication archive and reporting.'

export function setDocumentMeta({
  title = '',
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '',
  image = '',
  type = 'website',
  siteName = DEFAULT_SITE_NAME,
} = {}) {
  const cleanSiteName = String(siteName || DEFAULT_SITE_NAME).trim() || DEFAULT_SITE_NAME
  const cleanTitle = String(title || cleanSiteName).trim() || cleanSiteName
  const cleanDescription = String(description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim() || DEFAULT_DESCRIPTION
  const url = buildAbsoluteUrl(canonicalPath)
  const imageUrl = image ? buildAbsoluteUrl(image) : ''

  document.title = cleanTitle === cleanSiteName ? cleanSiteName : `${cleanTitle} | ${cleanSiteName}`
  setMeta('name', 'description', cleanDescription)
  setMeta('property', 'og:title', cleanTitle)
  setMeta('property', 'og:description', cleanDescription)
  setMeta('property', 'og:type', type)
  setMeta('property', 'og:site_name', cleanSiteName)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', imageUrl)
  setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  setMeta('name', 'twitter:title', cleanTitle)
  setMeta('name', 'twitter:description', cleanDescription)
  setMeta('name', 'twitter:image', imageUrl)
  setCanonical(url)
  document.documentElement.dataset.colophonMetaPath = new URL(url).pathname
  document.documentElement.dataset.colophonMetaTitle = cleanTitle
  document.dispatchEvent(new CustomEvent('colophon:meta-updated', { detail: { path: canonicalPath, title: cleanTitle, siteName: cleanSiteName } }))
}

export function stripHtmlForMeta(value, fallback = '') {
  return String(value || fallback || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildPostMeta(piece, { path = '', siteName = DEFAULT_SITE_NAME } = {}) {
  const title = stripHtmlForMeta(piece?.seoTitle || piece?.title || 'Untitled')
  const description = stripHtmlForMeta(
    piece?.seoDescription || piece?.excerpt || piece?.subtitle || piece?.body || piece?.bodyHtml,
    DEFAULT_DESCRIPTION,
  ).slice(0, 220)
  const image = String(piece?.featuredImage || piece?.heroImage || piece?.imageUrl || '').trim()

  return {
    title,
    description,
    canonicalPath: path || `/post/${piece?.slug || ''}`,
    image,
    type: 'article',
    siteName,
  }
}

function setMeta(attribute, key, content) {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!content) {
    if (node) node.remove()
    return
  }
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute(attribute, key)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function setCanonical(href) {
  let node = document.head.querySelector('link[rel="canonical"]')
  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', 'canonical')
    document.head.appendChild(node)
  }
  node.setAttribute('href', href)
}

function buildAbsoluteUrl(pathOrUrl) {
  const raw = String(pathOrUrl || '').trim()
  if (/^https?:\/\//i.test(raw)) return raw
  const path = raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`
  return `${window.location.origin}${path}`
}
