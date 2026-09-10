import { normalizeAppearance } from '../../shared/publicTypographyModel.js'
import { normalizePublicNavigation } from '../../shared/publicNavigationModel.js'

export const PUBLIC_CONFIG_SCHEMA_VERSION = 5

const FIELD_KEY_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/
export const DEFAULT_PUBLICATION_IDENTITY = {
  publicationName: 'Independent Publication',
  shortName: '',
  siteUrl: '',
  logoUrl: '',
  correspondenceLabel: 'Publication editor',
  socialIdentity: '',
  contactEmail: '',
  footerIdentity: '',
  footerText: '',
}

export function normalizePublicConfig(input) {
  const raw = input || {}
  const incomingVersion = Number(raw.version || 0)
  const legacyTypography = !raw.appearance && incomingVersion > 0 && incomingVersion < 4
  return {
    version: PUBLIC_CONFIG_SCHEMA_VERSION,
    identity: normalizeIdentity(raw.identity),
    appearance: normalizeAppearance(raw.appearance, { legacyTypography }),
    navigation: normalizePublicNavigation(raw.navigation),
    text: sanitizeTextMap(raw.text || {}),
    styles: sanitizeStyleMap(raw.styles || {}),
    blocks: sanitizeBlocks(raw.blocks || {}),
  }
}

export function sanitizeTextMap(input) {
  const out = {}
  for (const [key, value] of Object.entries(input || {})) {
    if (!isValidFieldKey(key)) continue
    out[key] = typeof value === 'string' ? value : String(value ?? '')
  }
  return out
}

export function sanitizeStyleMap(input) {
  const out = {}
  for (const [field, styleObj] of Object.entries(input || {})) {
    if (!isValidFieldKey(field) || !styleObj || typeof styleObj !== 'object' || Array.isArray(styleObj)) continue
    const next = {}
    const fontSize = normalizeCssSize(styleObj.fontSize, 'rem')
    const lineHeight = normalizeNumberString(styleObj.lineHeight, 0.7, 3)
    const maxWidth = normalizeCssSize(styleObj.maxWidth, 'ch')
    const letterSpacing = normalizeCssSize(styleObj.letterSpacing, 'em')
    const textTransform = normalizeEnum(styleObj.textTransform, ['none', 'uppercase', 'lowercase', 'capitalize'])
    if (fontSize) next.fontSize = fontSize
    if (lineHeight) next.lineHeight = lineHeight
    if (maxWidth) next.maxWidth = maxWidth
    if (letterSpacing) next.letterSpacing = letterSpacing
    if (textTransform) next.textTransform = textTransform
    if (Object.keys(next).length) out[field] = next
  }
  return out
}

export function sanitizeBlocks(input) { return deepClonePlainObject(input || {}) }

export function normalizeIdentity(input = {}) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  return {
    publicationName: clean(raw.publicationName || DEFAULT_PUBLICATION_IDENTITY.publicationName, 160),
    shortName: clean(raw.shortName, 80),
    siteUrl: clean(raw.siteUrl, 2000),
    logoUrl: clean(raw.logoUrl, 2000),
    correspondenceLabel: clean(raw.correspondenceLabel || DEFAULT_PUBLICATION_IDENTITY.correspondenceLabel, 160),
    socialIdentity: clean(raw.socialIdentity, 240),
    contactEmail: clean(raw.contactEmail, 320),
    footerIdentity: clean(raw.footerIdentity, 240),
    footerText: clean(raw.footerText, 500),
  }
}

export function mergePublicConfig(base, patch) {
  const normalizedBase = normalizePublicConfig(base)
  const rawPatch = patch || {}
  return {
    version: PUBLIC_CONFIG_SCHEMA_VERSION,
    identity: { ...normalizedBase.identity, ...sanitizeIdentityPatch(rawPatch.identity) },
    appearance: mergeAppearance(normalizedBase.appearance, rawPatch.appearance),
    navigation: Object.prototype.hasOwnProperty.call(rawPatch, 'navigation') ? normalizePublicNavigation(rawPatch.navigation) : normalizedBase.navigation,
    text: { ...normalizedBase.text, ...sanitizeTextMap(rawPatch.text || {}) },
    styles: { ...normalizedBase.styles, ...sanitizeStyleMap(rawPatch.styles || {}) },
    blocks: deepMergeObjects(normalizedBase.blocks, sanitizeBlocks(rawPatch.blocks || {})),
  }
}

export function validatePublicConfig(input) {
  const errors = []
  const warnings = []
  const raw = input || {}
  if (raw.identity && (typeof raw.identity !== 'object' || Array.isArray(raw.identity))) errors.push('identity must be an object')
  if (raw.appearance && (typeof raw.appearance !== 'object' || Array.isArray(raw.appearance))) errors.push('appearance must be an object')
  if (raw.navigation && (typeof raw.navigation !== 'object' || Array.isArray(raw.navigation))) errors.push('navigation must be an object')
  if (raw.text && typeof raw.text !== 'object') errors.push('text must be an object')
  if (raw.styles && typeof raw.styles !== 'object') errors.push('styles must be an object')
  if (raw.blocks && typeof raw.blocks !== 'object') errors.push('blocks must be an object')
  for (const key of Object.keys(raw.text || {})) if (!isValidFieldKey(key)) warnings.push(`invalid text key skipped: ${key}`)
  for (const key of Object.keys(raw.styles || {})) if (!isValidFieldKey(key)) warnings.push(`invalid style key skipped: ${key}`)
  return { ok: errors.length === 0, errors, warnings, normalized: normalizePublicConfig(raw) }
}

export function isValidFieldKey(key) { return typeof key === 'string' && FIELD_KEY_RE.test(key) }

function sanitizeIdentityPatch(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const out = {}
  for (const key of Object.keys(DEFAULT_PUBLICATION_IDENTITY)) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const max = key.endsWith('Url') ? 2000 : key === 'contactEmail' ? 320 : key === 'footerText' ? 500 : 240
      out[key] = clean(input[key], max)
    }
  }
  return out
}

function mergeAppearance(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return normalizeAppearance(base)
  const next = {
    typography: { ...(base?.typography || {}), ...(patch.typography || {}) },
    customFonts: Object.prototype.hasOwnProperty.call(patch, 'customFonts') ? patch.customFonts : (base?.customFonts || []),
  }
  return normalizeAppearance(next)
}

function clean(value, max) { return String(value || '').trim().slice(0, max) }
function normalizeCssSize(value, unit) { if (value == null || value === '') return ''; const str = String(value).trim(); if (str.endsWith(unit)) { const n = Number(str.slice(0, -unit.length)); return Number.isFinite(n) ? `${n}${unit}` : '' } const n = Number(str); return Number.isFinite(n) ? `${n}${unit}` : '' }
function normalizeNumberString(value, min, max) { if (value == null || value === '') return ''; const n = Number(String(value).trim()); return Number.isFinite(n) && n >= min && n <= max ? String(n) : '' }
function normalizeEnum(value, allowed) { const str = String(value || '').trim().toLowerCase(); return allowed.includes(str) ? str : '' }
function deepClonePlainObject(obj) { if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}; const out = {}; for (const [k, v] of Object.entries(obj)) { if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = deepClonePlainObject(v); else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v == null) out[k] = v } return out }
function deepMergeObjects(base, patch) { const out = deepClonePlainObject(base); for (const [k, v] of Object.entries(deepClonePlainObject(patch))) { if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = deepMergeObjects(out[k], v); else out[k] = v } return out }
