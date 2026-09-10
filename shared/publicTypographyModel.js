export const TYPOGRAPHY_ROLES = ['display', 'heading', 'body', 'navigation']

export const PUBLIC_FONT_PRESETS = [
  {
    id: 'system-sans',
    label: 'System sans-serif',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    source: 'system',
  },
  {
    id: 'system-serif',
    label: 'System serif',
    stack: 'ui-serif, Georgia, "Times New Roman", serif',
    source: 'system',
  },
  {
    id: 'monospace',
    label: 'Monospace',
    stack: 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    source: 'system',
  },
  { id: 'griffos', label: 'Griffos', stack: 'Griffos, Georgia, serif', source: 'bundled' },
  { id: 'vanilla-extract', label: 'Vanilla Extract', stack: '"Vanilla Extract", "Iowan Old Style", Georgia, serif', source: 'bundled' },
  { id: 'stamp', label: 'Stamp', stack: 'Stamp, Impact, sans-serif', source: 'bundled' },
]

export const DEFAULT_TYPOGRAPHY = {
  display: { fontId: 'system-sans' },
  heading: { fontId: 'system-sans' },
  body: { fontId: 'system-serif' },
  navigation: { fontId: 'system-sans' },
}

export const LEGACY_colophon_TYPOGRAPHY = {
  display: { fontId: 'stamp' },
  heading: { fontId: 'griffos' },
  body: { fontId: 'vanilla-extract' },
  navigation: { fontId: 'stamp' },
}

const PRESET_IDS = new Set(PUBLIC_FONT_PRESETS.map((item) => item.id))
const FONT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/
const FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$/

export function normalizeAppearance(input = {}, { legacyTypography = false } = {}) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const customFonts = normalizeCustomFonts(raw.customFonts)
  const fallback = legacyTypography ? LEGACY_colophon_TYPOGRAPHY : DEFAULT_TYPOGRAPHY
  return {
    typography: normalizeTypography(raw.typography, customFonts, fallback),
    customFonts,
  }
}

export function normalizeTypography(input = {}, customFonts = [], fallback = DEFAULT_TYPOGRAPHY) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const customIds = new Set(customFonts.map((font) => `custom:${font.id}`))
  const out = {}
  for (const role of TYPOGRAPHY_ROLES) {
    const requested = String(raw?.[role]?.fontId || raw?.[role] || fallback?.[role]?.fontId || DEFAULT_TYPOGRAPHY[role].fontId).trim()
    out[role] = { fontId: PRESET_IDS.has(requested) || customIds.has(requested) ? requested : fallback?.[role]?.fontId || DEFAULT_TYPOGRAPHY[role].fontId }
  }
  return out
}

export function normalizeCustomFonts(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  const out = []
  for (const entry of input.slice(0, 24)) {
    const font = normalizeCustomFont(entry)
    if (!font || seen.has(font.id)) continue
    seen.add(font.id)
    out.push(font)
  }
  return out
}

export function normalizeCustomFont(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const id = String(input.id || '').trim().toLowerCase()
  const familyName = String(input.familyName || '').trim()
  const url = safeFontUrl(input.url)
  const format = normalizeFontFormat(input.format, url)
  if (!FONT_ID_RE.test(id) || !FAMILY_RE.test(familyName) || !url || !format) return null
  const displayName = cleanText(input.displayName || familyName, 100)
  const style = ['normal', 'italic'].includes(String(input.style || '').toLowerCase()) ? String(input.style).toLowerCase() : 'normal'
  const numericWeight = Number(input.weight)
  const weight = Number.isFinite(numericWeight) && numericWeight >= 100 && numericWeight <= 900
    ? Math.round(numericWeight / 100) * 100
    : 400
  return { id, displayName, familyName, url, format, style, weight }
}

export function fontStackForRole(appearance, role) {
  const normalized = normalizeAppearance(appearance)
  const fontId = normalized.typography?.[role]?.fontId || DEFAULT_TYPOGRAPHY[role]?.fontId || 'system-sans'
  const preset = PUBLIC_FONT_PRESETS.find((item) => item.id === fontId)
  if (preset) return preset.stack
  if (fontId.startsWith('custom:')) {
    const custom = normalized.customFonts.find((item) => `custom:${item.id}` === fontId)
    if (custom) return `"${custom.familyName}", system-ui, sans-serif`
  }
  return PUBLIC_FONT_PRESETS.find((item) => item.id === DEFAULT_TYPOGRAPHY[role]?.fontId)?.stack || PUBLIC_FONT_PRESETS[0].stack
}

export function buildCustomFontFaceCss(appearance) {
  const normalized = normalizeAppearance(appearance)
  return normalized.customFonts.map((font) => (
    `@font-face{font-family:"${font.familyName}";src:url("${escapeCssUrl(font.url)}") format("${font.format}");font-style:${font.style};font-weight:${font.weight};font-display:swap;}`
  )).join('\n')
}

export function safeFontUrl(value) {
  const raw = String(value || '').trim()
  if (!raw || /[\n\r"'{};]/.test(raw) || raw.includes('..')) return ''
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('./')) return raw
  if (/^https:\/\//i.test(raw)) return raw
  return ''
}

export function fontIdFromLabel(value) {
  return cleanText(value, 64).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64)
}

function normalizeFontFormat(value, url) {
  const requested = String(value || '').trim().toLowerCase()
  if (requested === 'woff2' || requested === 'woff') return requested
  const cleanUrl = String(url || '').split(/[?#]/)[0].toLowerCase()
  if (cleanUrl.endsWith('.woff2')) return 'woff2'
  if (cleanUrl.endsWith('.woff')) return 'woff'
  return ''
}

function escapeCssUrl(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function cleanText(value, max = 160) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
}
