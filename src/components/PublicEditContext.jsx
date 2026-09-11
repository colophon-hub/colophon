import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { mergePublicConfig } from '../lib/publicConfig'
import { getPublicConfigPermissions, loadPublicConfigPayload, savePublicConfigPayload } from '../lib/publicConfigApi'
import { buildPublicConfigPayload } from '../lib/publicDraftExport'
import { normalizePublicConfig, PUBLIC_CONFIG_SCHEMA_VERSION } from '../lib/publicConfigSchema'
import { useAdminAuth } from './AdminAuthContext'

const STORAGE_KEY = 'colophon-public-edit-draft-v6'
const LEGACY_STORAGE_KEYS = ['colophon-public-edit-draft-v5', 'colophon-public-edit-draft-v4', 'colophon-public-edit-draft-v3', 'colophon-public-edit-draft-v2']
const PublicEditContext = createContext(null)

function emptyConfig() { return normalizePublicConfig({}) }
function emptyDraft() { return { identity: {}, indieweb: {}, themes: {}, appearance: {}, navigation: {}, text: {}, styles: {}, blocks: {} } }
function toDraftShape(config) { return { identity: config?.identity || {}, indieweb: config?.indieweb || {}, themes: config?.themes || {}, appearance: config?.appearance || {}, navigation: config?.navigation || {}, text: config?.text || {}, styles: config?.styles || {}, blocks: config?.blocks || {} } }
function clearDraftCache() { try { window.localStorage.removeItem(STORAGE_KEY); LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key)) } catch {} }
function loadDraftCache() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean)
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft()
  } catch { return emptyDraft() }
}

export function PublicEditProvider({ children }) {
  const [isEditing, setIsEditing] = useState(false)
  const { isAuthenticated } = useAdminAuth()
  const isAdmin = isAuthenticated
  const [canSave, setCanSave] = useState(false)
  const [backendMode, setBackendMode] = useState('unknown')
  const [selectedField, setSelectedField] = useState(null)
  const [savedConfig, setSavedConfig] = useState(() => emptyConfig())
  const [draft, setDraft] = useState(loadDraftCache)
  const draftRef = useRef(draft)
  const [loadState, setLoadState] = useState('idle')
  const [saveState, setSaveState] = useState('idle')
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [permissionState, setPermissionState] = useState('idle')
  const [permissionError, setPermissionError] = useState('')
  const [lastLoadedAt, setLastLoadedAt] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [configVersion, setConfigVersion] = useState(1)
  const [schemaVersion, setSchemaVersion] = useState(PUBLIC_CONFIG_SCHEMA_VERSION)

  useEffect(() => {
    draftRef.current = draft
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
    } catch {}
  }, [draft])

  function setDraftSnapshot(updater) {
    const previous = draftRef.current || emptyDraft()
    const next = typeof updater === 'function' ? updater(previous) : updater
    draftRef.current = next
    setDraft(next)
  }

  function hasPendingDraftChanges() {
    const current = draftRef.current || emptyDraft()
    return Boolean(
      Object.keys(current.identity || {}).length
      || Object.keys(current.indieweb || {}).length
      || Object.keys(current.themes || {}).length
      || Object.keys(current.appearance || {}).length
      || Object.keys(current.navigation || {}).length
      || Object.keys(current.text || {}).length
      || Object.keys(current.styles || {}).length
      || Object.keys(current.blocks || {}).length
    )
  }

  async function reloadFromBackend() {
    try {
      setLoadState('loading'); setLoadError('')
      const data = await loadPublicConfigPayload()
      setSavedConfig(normalizePublicConfig(data?.config || {}))
      setBackendMode(data?.mode || 'unknown')
      setLastLoadedAt(data?.updatedAt || new Date().toISOString())
      setConfigVersion(Number(data?.version || 1))
      setSchemaVersion(Number(data?.schemaVersion || PUBLIC_CONFIG_SCHEMA_VERSION))
      setLoadState('loaded')
    } catch (error) { setLoadState('error'); setLoadError(String(error?.message || error)) }
  }

  useEffect(() => {
    if (!isAdmin) {
      setCanSave(false); setPermissionState('idle'); setPermissionError(''); reloadFromBackend(); return
    }
    let cancelled = false
    async function boot() {
      try {
        setPermissionState('loading'); setPermissionError('')
        const permissionData = await getPublicConfigPermissions()
        if (!cancelled) { setCanSave(permissionData?.canEdit === true); setBackendMode(permissionData?.mode || 'unknown'); setPermissionState('loaded') }
      } catch (error) {
        if (!cancelled) { setPermissionState('error'); setPermissionError(String(error?.message || error)); setCanSave(false); setBackendMode('unknown') }
      }
      if (!cancelled) await reloadFromBackend()
    }
    boot()
    return () => { cancelled = true }
  }, [isAdmin])

  useEffect(() => { if (!isAdmin) { setIsEditing(false); setSelectedField(null) } }, [isAdmin])
  useEffect(() => {
    function handleKeyDown(e) {
      const active = document.activeElement
      if (active?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active?.tagName)) return
      if (e.key === 'Escape') { setSelectedField(null); setIsEditing(false) }
    }
    if (isEditing) { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown) }
  }, [isEditing])

  const changedIdentityFields = useMemo(() => Object.keys(draft?.identity || {}).sort(), [draft])
  const changedIndieWebFields = useMemo(() => Object.keys(draft?.indieweb || {}).sort(), [draft])
  const changedThemeFields = useMemo(() => Object.keys(draft?.themes || {}).sort(), [draft])
  const changedAppearanceFields = useMemo(() => Object.keys(draft?.appearance || {}).sort(), [draft])
  const changedNavigationFields = useMemo(() => Object.keys(draft?.navigation || {}).sort(), [draft])
  const changedTextFields = useMemo(() => Object.keys(draft?.text || {}).sort(), [draft])
  const changedStyleFields = useMemo(() => Object.keys(draft?.styles || {}).sort(), [draft])
  const changedBlockFields = useMemo(() => Object.keys(draft?.blocks || {}).sort(), [draft])
  const changedFields = useMemo(() => [...new Set([
    ...changedIdentityFields.map((key) => `identity.${key}`),
    ...changedIndieWebFields.map((key) => `indieweb.${key}`),
    ...changedThemeFields.map((key) => `themes.${key}`),
    ...changedAppearanceFields.map((key) => `appearance.${key}`),
    ...changedNavigationFields.map((key) => `navigation.${key}`),
    ...changedTextFields,
    ...changedStyleFields,
    ...changedBlockFields.map((key) => `blocks.${key}`),
  ])].sort(), [changedIdentityFields, changedIndieWebFields, changedThemeFields, changedAppearanceFields, changedNavigationFields, changedTextFields, changedStyleFields, changedBlockFields])

  const draftStats = useMemo(() => ({ identityCount: changedIdentityFields.length, indiewebCount: changedIndieWebFields.length, themeCount: changedThemeFields.length, appearanceCount: changedAppearanceFields.length, navigationCount: changedNavigationFields.length, textCount: changedTextFields.length, styleCount: changedStyleFields.length, blockCount: changedBlockFields.length, totalCount: changedFields.length }), [changedIdentityFields, changedIndieWebFields, changedThemeFields, changedAppearanceFields, changedNavigationFields, changedTextFields, changedStyleFields, changedBlockFields, changedFields])
  const savedStats = useMemo(() => ({ identityCount: Object.keys(savedConfig?.identity || {}).length, indiewebCount: Object.keys(savedConfig?.indieweb || {}).length, themeCount: Object.keys(savedConfig?.themes || {}).length, appearanceCount: Object.keys(savedConfig?.appearance || {}).length, navigationCount: Object.keys(savedConfig?.navigation || {}).length, textCount: Object.keys(savedConfig?.text || {}).length, styleCount: Object.keys(savedConfig?.styles || {}).length, blockCount: Object.keys(savedConfig?.blocks || {}).length }), [savedConfig])
  const effectiveConfig = useMemo(() => mergePublicConfig(savedConfig || emptyConfig(), draft || emptyDraft()), [savedConfig, draft])
  const effectiveStats = useMemo(() => ({ identityCount: Object.keys(effectiveConfig?.identity || {}).length, indiewebCount: Object.keys(effectiveConfig?.indieweb || {}).length, themeCount: Object.keys(effectiveConfig?.themes || {}).length, appearanceCount: Object.keys(effectiveConfig?.appearance || {}).length, navigationCount: Object.keys(effectiveConfig?.navigation || {}).length, textCount: Object.keys(effectiveConfig?.text || {}).length, styleCount: Object.keys(effectiveConfig?.styles || {}).length, blockCount: Object.keys(effectiveConfig?.blocks || {}).length }), [effectiveConfig])
  const hasDraftChanges = changedFields.length > 0
  const isConfigReady = ['d1', 'browser-local'].includes(backendMode) && loadState === 'loaded'
  const startEditing = useCallback(() => { if (!isAdmin) return false; setIsEditing(true); return true }, [isAdmin])

  const value = useMemo(() => ({
    isEditing, isAdmin, canSave, backendMode, isConfigReady, selectedField, setSelectedField, draft, savedConfig, effectiveConfig,
    changedFields, changedIdentityFields, changedIndieWebFields, changedThemeFields, changedAppearanceFields, changedNavigationFields, changedTextFields, changedStyleFields, draftStats, savedStats, effectiveStats, hasDraftChanges,
    loadState, saveState, loadError, saveError, permissionState, permissionError, lastLoadedAt, lastSavedAt, configVersion, schemaVersion,
    setSavedConfig, startEditing,
    toggleEditing: () => setIsEditing((v) => { const next = !v; if (!next) setSelectedField(null); return next }),
    stopEditing() { setSelectedField(null); setIsEditing(false) },
    async reloadFromBackend() { await reloadFromBackend() },
    discardDraftAndReload() { setDraftSnapshot(emptyDraft()); clearDraftCache(); setSelectedField(null); return reloadFromBackend() },
    updateIdentity(field, value) { setDraftSnapshot((prev) => ({ ...prev, identity: { ...(prev.identity || {}), [field]: value } })) },
    updateIndieWeb(patch) { setDraftSnapshot((prev) => ({ ...prev, indieweb: { ...(prev.indieweb || {}), ...(patch || {}) } })) },
    updateThemes(themes) { setDraftSnapshot((prev) => ({ ...prev, themes })) },
    updateAppearance(patch) { setDraftSnapshot((prev) => ({ ...prev, appearance: { ...(prev.appearance || {}), ...(patch || {}) } })) },
    updateTypography(role, fontId) { setDraftSnapshot((prev) => ({ ...prev, appearance: { ...(prev.appearance || {}), typography: { ...(prev.appearance?.typography || {}), [role]: { fontId } } } })) },
    updateCustomFonts(customFonts) { setDraftSnapshot((prev) => ({ ...prev, appearance: { ...(prev.appearance || {}), customFonts } })) },
    updateNavigation(items) { setDraftSnapshot((prev) => ({ ...prev, navigation: { items } })) },
    updateText(field, value) { setDraftSnapshot((prev) => ({ ...prev, text: { ...prev.text, [field]: value } })) },
    updateStyle(field, patch) { setDraftSnapshot((prev) => ({ ...prev, styles: { ...prev.styles, [field]: { ...(prev.styles?.[field] || {}), ...patch } } })) },
    resetField(field) {
      setDraftSnapshot((prev) => { const nextText = { ...(prev.text || {}) }; const nextStyles = { ...(prev.styles || {}) }; delete nextText[field]; delete nextStyles[field]; return { ...prev, text: nextText, styles: nextStyles } })
    },
    async saveDraftToBackend() {
      if (!canSave || !['d1', 'browser-local'].includes(backendMode) || loadState !== 'loaded') { setSaveState('error'); setSaveError(!canSave ? 'save not allowed' : 'wait for the saved configuration to finish loading before saving'); return }
      try {
        setSaveState('saving'); setSaveError('')
        const next = mergePublicConfig(savedConfig || emptyConfig(), draftRef.current || emptyDraft())
        const data = await savePublicConfigPayload(buildPublicConfigPayload(next))
        const saved = normalizePublicConfig(data?.received?.publicSite || data?.config || next)
        setSavedConfig(saved); setDraftSnapshot(emptyDraft()); clearDraftCache()
        setBackendMode(data?.mode || backendMode || 'unknown'); setLastSavedAt(data?.updatedAt || new Date().toISOString()); setConfigVersion(Number(data?.version || configVersion || 1)); setSchemaVersion(Number(data?.schemaVersion || schemaVersion || PUBLIC_CONFIG_SCHEMA_VERSION)); setSaveState('saved'); window.setTimeout(() => setSaveState('idle'), 1500)
      } catch (error) { setSaveState('error'); setSaveError(String(error?.message || error)) }
    },
    clearDraft() { setDraftSnapshot(emptyDraft()); clearDraftCache() },
    importDraftPatch(configLike) { const normalized = normalizePublicConfig(configLike); setDraftSnapshot((prev) => mergePublicConfig(prev || emptyDraft(), toDraftShape(normalized))) },
    replaceDraftWithImported(configLike) { setDraftSnapshot(toDraftShape(normalizePublicConfig(configLike))) },
    exportDraft() { return JSON.stringify(draftRef.current || draft, null, 2) },
    hasPendingDraftChanges,
  }), [isEditing, isAdmin, canSave, backendMode, isConfigReady, selectedField, draft, savedConfig, effectiveConfig, changedFields, changedIdentityFields, changedIndieWebFields, changedThemeFields, changedAppearanceFields, changedNavigationFields, changedTextFields, changedStyleFields, draftStats, savedStats, effectiveStats, hasDraftChanges, loadState, saveState, loadError, saveError, permissionState, permissionError, lastLoadedAt, lastSavedAt, configVersion, schemaVersion, startEditing])

  return <PublicEditContext.Provider value={value}>{children}</PublicEditContext.Provider>
}

export function usePublicEdit() { const ctx = useContext(PublicEditContext); if (!ctx) throw new Error('usePublicEdit must be used inside PublicEditProvider'); return ctx }
