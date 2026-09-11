export const UI_APPEARANCE_MODES = Object.freeze(['system', 'light', 'dark'])
export const DEFAULT_UI_APPEARANCE = 'system'

export function normalizeUiAppearance(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return UI_APPEARANCE_MODES.includes(normalized) ? normalized : DEFAULT_UI_APPEARANCE
}

export function resolveUiAppearance(preference, systemPrefersDark = false) {
  const normalized = normalizeUiAppearance(preference)
  if (normalized === 'system') return systemPrefersDark ? 'dark' : 'light'
  return normalized
}
