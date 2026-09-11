import { DEFAULT_UI_APPEARANCE, normalizeUiAppearance, resolveUiAppearance } from '../../shared/productAppearance.js'

export const UI_APPEARANCE_STORAGE_KEY = 'colophon-ui-appearance-v1'
export const UI_APPEARANCE_EVENT = 'colophon:appearance-change'

let mediaQuery = null
let mediaListenerInstalled = false

function readPreference() {
  try { return normalizeUiAppearance(window.localStorage.getItem(UI_APPEARANCE_STORAGE_KEY) || DEFAULT_UI_APPEARANCE) } catch { return DEFAULT_UI_APPEARANCE }
}
function systemPrefersDark() { return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches) }
function apply(preference) {
  const normalized = normalizeUiAppearance(preference)
  const resolved = resolveUiAppearance(normalized, systemPrefersDark())
  const root = document.documentElement
  root.dataset.uiThemePreference = normalized
  root.dataset.uiTheme = resolved
  root.style.colorScheme = resolved
  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', resolved === 'dark' ? '#111418' : '#f4f5f7')
  return { preference: normalized, resolved }
}

export function getUiAppearance() {
  if (typeof window === 'undefined') return DEFAULT_UI_APPEARANCE
  return readPreference()
}
export function setUiAppearance(value) {
  if (typeof window === 'undefined') return { preference: DEFAULT_UI_APPEARANCE, resolved: 'light' }
  const preference = normalizeUiAppearance(value)
  try { window.localStorage.setItem(UI_APPEARANCE_STORAGE_KEY, preference) } catch {}
  const state = apply(preference)
  window.dispatchEvent(new CustomEvent(UI_APPEARANCE_EVENT, { detail: state }))
  return state
}
export function initializeUiAppearance() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  apply(readPreference())
  if (!mediaQuery && window.matchMedia) mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  if (mediaQuery && !mediaListenerInstalled) {
    const onChange = () => {
      const preference = readPreference()
      if (preference !== 'system') return
      const state = apply(preference)
      window.dispatchEvent(new CustomEvent(UI_APPEARANCE_EVENT, { detail: state }))
    }
    mediaQuery.addEventListener?.('change', onChange)
    mediaQuery.addListener?.(onChange)
    mediaListenerInstalled = true
  }
}
export function subscribeUiAppearance(listener) {
  const wrapped = (event) => listener?.(event?.detail || apply(readPreference()))
  window.addEventListener(UI_APPEARANCE_EVENT, wrapped)
  return () => window.removeEventListener(UI_APPEARANCE_EVENT, wrapped)
}
