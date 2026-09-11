import { useEffect, useMemo, useState } from 'react'
import { usePublicEdit } from './PublicEditContext'
import {
  PUBLIC_FONT_PRESETS,
  TYPOGRAPHY_ROLES,
  fontIdFromLabel,
  fontStackForRole,
} from '../../shared/publicTypographyModel.js'
import { makeCustomNavigationItem, resolveVisibleNavigation } from '../../shared/publicNavigationModel.js'
import {
  getPublishingModulePrefs,
  hydratePublishingSetup,
  publishingModulesChangeEvent,
} from '../lib/publishingModules'

function count(value, ready) { return ready ? value : '—' }
const IDENTITY_FIELDS = [
  ['publicationName', 'Publication name', 'Independent Publication'],
  ['shortName', 'Short name', ''],
  ['siteUrl', 'Site URL', 'https://example.org'],
  ['logoUrl', 'Logo URL', 'https://example.org/logo.png'],
  ['correspondenceLabel', 'Editor / correspondence label', 'Publication editor'],
  ['socialIdentity', 'Default social identity', '@publication'],
  ['contactEmail', 'Contact email', 'contact@example.org'],
  ['footerIdentity', 'Footer identity', 'Independent Publication'],
  ['footerText', 'Footer text', 'Independent publishing from…'],
]
const ROLE_LABELS = {
  display: 'Display / publication title',
  heading: 'Headings',
  body: 'Body / article text',
  navigation: 'Navigation / interface',
}

export function AdminPublicConfigCard() {
  const {
    canSave, backendMode, changedFields, changedTextFields, changedStyleFields, draftStats, savedStats, effectiveStats,
    effectiveConfig, hasDraftChanges, loadState, saveState, loadError, saveError, permissionError, lastLoadedAt, lastSavedAt,
    updateIdentity, updateIndieWeb, updateTypography, updateCustomFonts, updateNavigation, saveDraftToBackend, reloadFromBackend, discardDraftAndReload,
  } = usePublicEdit()
  const backendReady = ['d1', 'browser-local'].includes(backendMode) && loadState === 'loaded'
  const errors = [permissionError, loadError, saveError].filter(Boolean)
  const identity = effectiveConfig?.identity || {}
  const indieweb = effectiveConfig?.indieweb || {}
  const appearance = effectiveConfig?.appearance || {}
  const navigationItems = effectiveConfig?.navigation?.items || []
  const customFonts = Array.isArray(appearance.customFonts) ? appearance.customFonts : []
  const [modulePrefs, setModulePrefs] = useState(() => getPublishingModulePrefs())
  const [fontForm, setFontForm] = useState({ displayName: '', familyName: '', style: 'normal', weight: '400', file: null })
  const [fontUploadState, setFontUploadState] = useState('idle')
  const [fontUploadMessage, setFontUploadMessage] = useState('')
  const fontOptions = useMemo(() => [
    ...PUBLIC_FONT_PRESETS.map((font) => ({ id: font.id, label: `${font.label}${font.source === 'bundled' ? ' · bundled' : ''}` })),
    ...customFonts.map((font) => ({ id: `custom:${font.id}`, label: `${font.displayName} · self-hosted` })),
  ], [customFonts])
  const visibleNavigation = useMemo(() => resolveVisibleNavigation(effectiveConfig?.navigation, modulePrefs?.modules || []), [effectiveConfig?.navigation, modulePrefs])

  useEffect(() => {
    const eventName = publishingModulesChangeEvent()
    const refresh = (event) => setModulePrefs(event?.detail || getPublishingModulePrefs())
    window.addEventListener(eventName, refresh)
    hydratePublishingSetup().then(setModulePrefs).catch(() => {})
    return () => window.removeEventListener(eventName, refresh)
  }, [])

  async function uploadFont() {
    const file = fontForm.file
    const extension = String(file?.name || '').split('.').pop()?.toLowerCase()
    if (!file || !['woff2', 'woff'].includes(extension)) {
      setFontUploadState('error')
      setFontUploadMessage('Choose a WOFF2 or WOFF font file.')
      return
    }
    const displayName = String(fontForm.displayName || '').trim() || file.name.replace(/\.[^.]+$/, '')
    const familyName = String(fontForm.familyName || displayName).trim()
    let id = fontIdFromLabel(displayName) || `font-${Date.now().toString(36)}`
    if (customFonts.some((font) => font.id === id)) id = `${id}-${Date.now().toString(36).slice(-4)}`
    setFontUploadState('uploading')
    setFontUploadMessage('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('filename', file.name)
      form.append('title', displayName)
      form.append('folder', 'fonts')
      form.append('role', 'publication-font')
      form.append('mimeType', extension === 'woff2' ? 'font/woff2' : 'font/woff')
      const response = await fetch('/api/media/files', { method: 'POST', credentials: 'same-origin', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data?.ok === false) throw new Error(data.error || `Font upload failed (${response.status})`)
      const media = data.media || data.asset || data.item || {}
      const url = String(media.publicUrl || media.url || media.downloadUrl || '')
      if (!url) throw new Error('Font uploaded but no usable media URL was returned.')
      updateCustomFonts([...customFonts, { id, displayName, familyName, url, format: extension, style: fontForm.style, weight: Number(fontForm.weight || 400) }])
      setFontForm({ displayName: '', familyName: '', style: 'normal', weight: '400', file: null })
      setFontUploadState('saved')
      setFontUploadMessage('Font added to this draft. Publish changes when the preview looks right.')
    } catch (error) {
      setFontUploadState('error')
      setFontUploadMessage(String(error?.message || error))
    }
  }

  function removeFont(id) {
    const remaining = customFonts.filter((font) => font.id !== id)
    updateCustomFonts(remaining)
    for (const role of TYPOGRAPHY_ROLES) {
      if (appearance?.typography?.[role]?.fontId === `custom:${id}`) updateTypography(role, role === 'body' ? 'system-serif' : 'system-sans')
    }
  }

  function patchNavItem(index, patch) {
    updateNavigation(navigationItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  function moveNavItem(index, direction) {
    const target = index + direction
    if (target < 0 || target >= navigationItems.length) return
    const next = [...navigationItems]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    updateNavigation(next)
  }

  function removeNavItem(index) { updateNavigation(navigationItems.filter((_, itemIndex) => itemIndex !== index)) }
  function addNavItem() { updateNavigation([...navigationItems, makeCustomNavigationItem(navigationItems)]) }

  return <section className="admin-public-config-card" aria-labelledby="public-config-title">
    <div className="admin-public-config-card__header"><div><div className="admin-public-config-card__eyebrow">Public site</div><h2 id="public-config-title">Identity &amp; appearance</h2><p className="description">The publication is the site your readers see. Colophon is the software running it.</p></div><div className={`admin-public-config-card__health${backendReady ? ' is-ready' : ''}`}><span className="admin-public-config-card__health-dot" aria-hidden="true" />{backendReady ? `${backendMode} connected` : loadState === 'loading' ? 'Loading' : 'Configuration unavailable'}</div></div>
    {errors.length ? <div className="admin-public-config-card__error" role="alert"><strong>Configuration error</strong><span>{errors[0]}</span></div> : null}

    <div className="admin-public-config-card__status" aria-label="Configuration status"><span><small>Backend</small><strong>{backendMode}</strong></span><span><small>Load</small><strong>{loadState}</strong></span><span><small>Publish</small><strong>{saveState}</strong></span><span><small>Permission</small><strong>{canSave ? 'can publish' : 'read only'}</strong></span></div>

    <div className="admin-public-config-card__identity">
      <h3>Publication identity</h3>
      <p className="description">This name and identity are used by the masthead, footer, metadata, feeds and publication-facing admin controls. Product-only screens may still identify the software as Colophon.</p>
      <div className="campaign-admin-grid">{IDENTITY_FIELDS.map(([key, label, placeholder]) => <label key={key} className="native-content-editor__field"><span>{label}</span>{key === 'footerText' ? <textarea rows="2" value={identity[key] || ''} placeholder={placeholder} onChange={(event) => updateIdentity(key, event.target.value)} /> : <input type={key === 'contactEmail' ? 'email' : key.endsWith('Url') ? 'url' : 'text'} value={identity[key] || ''} placeholder={placeholder} onChange={(event) => updateIdentity(key, event.target.value)} />}</label>)}</div>
    </div>

    <div className="admin-public-config-card__identity admin-public-config-card__indieweb">
      <h3>IndieWeb identity</h3>
      <p className="description">Optional identity used for h-card and rel=me markup. No social platform is required.</p>
      <div className="campaign-admin-grid">
        <label className="native-content-editor__field"><span>Author / identity name</span><input value={indieweb.authorName || ''} onChange={(event) => updateIndieWeb({ authorName: event.target.value })} /></label>
        <label className="native-content-editor__field"><span>Author / profile URL</span><input type="url" value={indieweb.authorUrl || ''} onChange={(event) => updateIndieWeb({ authorUrl: event.target.value })} placeholder="https://example.org/about" /></label>
        <label className="native-content-editor__field"><span>Author photo URL</span><input value={indieweb.authorPhotoUrl || ''} onChange={(event) => updateIndieWeb({ authorPhotoUrl: event.target.value })} placeholder="/media/avatar.jpg or https://…" /></label>
        <label className="native-content-editor__field"><span>rel=me URLs, one per line</span><textarea rows="4" value={(indieweb.relMe || []).join('\n')} onChange={(event) => updateIndieWeb({ relMe: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} placeholder={'https://social.example/@name\nhttps://github.com/name'} /></label>
      </div>
    </div>

    <div className="admin-public-config-card__identity admin-public-config-card__navigation">
      <h3>Primary navigation</h3>
      <p className="description">This is the publication menu, not a Colophon product menu. Rename, reorder, hide, remove, or add links. Campaign and investigation links stay hidden unless those publishing tools are enabled.</p>
      <div className="public-navigation-editor">
        {navigationItems.map((item, index) => {
          const moduleDisabled = Boolean(item.module && !modulePrefs?.modules?.includes(item.module))
          return <div className="public-navigation-editor__row" key={item.id}>
            <label className="public-navigation-editor__enabled"><input type="checkbox" checked={item.enabled !== false} onChange={(event) => patchNavItem(index, { enabled: event.target.checked })} /><span>Show</span></label>
            <label className="native-content-editor__field"><span>Label</span><input value={item.label || ''} onChange={(event) => patchNavItem(index, { label: event.target.value })} /></label>
            <label className="native-content-editor__field"><span>Destination</span><input value={item.href || ''} onChange={(event) => patchNavItem(index, { href: event.target.value })} placeholder="/about or https://…" /></label>
            <div className="public-navigation-editor__tools"><button className="button" type="button" onClick={() => moveNavItem(index, -1)} disabled={index === 0} aria-label={`Move ${item.label} up`}>↑</button><button className="button" type="button" onClick={() => moveNavItem(index, 1)} disabled={index === navigationItems.length - 1} aria-label={`Move ${item.label} down`}>↓</button><button className="button" type="button" onClick={() => removeNavItem(index)}>Remove</button></div>
            {item.module ? <small className={moduleDisabled ? 'public-navigation-editor__module is-disabled' : 'public-navigation-editor__module'}>{moduleDisabled ? `Hidden because ${item.module} is disabled in Publishing tools.` : `Uses the ${item.module} publishing tool.`}</small> : null}
          </div>
        })}
        {!navigationItems.length ? <p className="description">No primary navigation links. The publication title still links home.</p> : null}
      </div>
      <div className="review-card__actions"><button className="button" type="button" onClick={addNavItem}>Add navigation link</button></div>
      <div className="public-type-preview public-navigation-preview" aria-label="Navigation preview"><strong>Visible menu:</strong> {visibleNavigation.length ? visibleNavigation.map((item) => item.label).join(' · ') : 'No links'}</div>
    </div>

    <div className="admin-public-config-card__identity admin-public-config-card__typography">
      <h3>Public typography</h3>
      <p className="description">Choose fonts independently for the publication title, headings, article text and navigation. System and bundled choices make no third-party font requests.</p>
      <div className="campaign-admin-grid">
        {TYPOGRAPHY_ROLES.map((role) => <label key={role} className="native-content-editor__field"><span>{ROLE_LABELS[role]}</span><select value={appearance?.typography?.[role]?.fontId || (role === 'body' ? 'system-serif' : 'system-sans')} onChange={(event) => updateTypography(role, event.target.value)}>{fontOptions.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}</select></label>)}
      </div>
      <div className="public-type-preview" aria-label="Typography preview">
        <div style={{ fontFamily: fontStackForRole(appearance, 'display') }} className="public-type-preview__display">{identity.publicationName || 'Publication Name'}</div>
        <h4 style={{ fontFamily: fontStackForRole(appearance, 'heading') }}>A Sample Headline</h4>
        <div style={{ fontFamily: fontStackForRole(appearance, 'navigation') }} className="public-type-preview__nav">{visibleNavigation.length ? visibleNavigation.map((item) => item.label).join(' · ') : 'Navigation preview'}</div>
        <p style={{ fontFamily: fontStackForRole(appearance, 'body') }}>This is what ordinary article text will look like. The preview uses the current unsaved draft without changing the live site.</p>
      </div>

      <details className="admin-public-config-card__changes">
        <summary>Add a self-hosted font</summary>
        <p className="description">Upload WOFF2 or WOFF. The font is stored with this publication; visitors are not sent to Google or another font service.</p>
        <div className="campaign-admin-grid">
          <label className="native-content-editor__field"><span>Display name</span><input value={fontForm.displayName} onChange={(event) => setFontForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="My Headline Font" /></label>
          <label className="native-content-editor__field"><span>Font family name</span><input value={fontForm.familyName} onChange={(event) => setFontForm((current) => ({ ...current, familyName: event.target.value }))} placeholder="My Headline Font" /></label>
          <label className="native-content-editor__field"><span>Style</span><select value={fontForm.style} onChange={(event) => setFontForm((current) => ({ ...current, style: event.target.value }))}><option value="normal">Normal</option><option value="italic">Italic</option></select></label>
          <label className="native-content-editor__field"><span>Weight</span><select value={fontForm.weight} onChange={(event) => setFontForm((current) => ({ ...current, weight: event.target.value }))}>{[100,200,300,400,500,600,700,800,900].map((weight) => <option key={weight} value={String(weight)}>{weight}</option>)}</select></label>
          <label className="native-content-editor__field"><span>Font file</span><input type="file" accept=".woff2,.woff,font/woff2,font/woff" onChange={(event) => setFontForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} /></label>
        </div>
        <div className="review-card__actions"><button className="button" type="button" onClick={uploadFont} disabled={fontUploadState === 'uploading'}>{fontUploadState === 'uploading' ? 'Uploading…' : 'Add font to draft'}</button>{fontUploadMessage ? <span className={fontUploadState === 'error' ? 'notice notice-error' : 'description'}>{fontUploadMessage}</span> : null}</div>
      </details>

      {customFonts.length ? <div className="public-custom-font-list"><h4>Self-hosted fonts</h4>{customFonts.map((font) => <div key={font.id} className="public-custom-font-list__item"><span style={{ fontFamily: `"${font.familyName}", sans-serif` }}><strong>{font.displayName}</strong> <small>{font.style} · {font.weight} · {font.format}</small></span><button className="button" type="button" onClick={() => removeFont(font.id)}>Remove</button></div>)}</div> : null}
    </div>

    <div className="admin-public-config-card__summary">
      <article><span>Published config</span><strong>{count((savedStats.identityCount || 0) + (savedStats.appearanceCount || 0) + (savedStats.navigationCount || 0) + savedStats.textCount + savedStats.styleCount + savedStats.blockCount, backendReady)}</strong><small>{backendReady ? `${savedStats.identityCount || 0} identity · ${savedStats.appearanceCount || 0} appearance · ${savedStats.navigationCount || 0} navigation · ${savedStats.textCount} text · ${savedStats.styleCount} styles` : 'Not loaded from the active store'}</small></article>
      <article><span>Draft changes</span><strong>{draftStats.totalCount}</strong><small>{draftStats.identityCount || 0} identity · {draftStats.appearanceCount || 0} appearance · {draftStats.navigationCount || 0} navigation · {changedTextFields.length} text · {changedStyleFields.length} styles</small></article>
      <article><span>Effective preview</span><strong>{(effectiveStats.identityCount || 0) + (effectiveStats.appearanceCount || 0) + (effectiveStats.navigationCount || 0) + effectiveStats.textCount + effectiveStats.styleCount + effectiveStats.blockCount}</strong><small>Unsaved draft is visible only in your editor preview until published.</small></article>
    </div>

    <div className="admin-public-config-card__meta"><span>Last load <strong>{lastLoadedAt || 'not loaded'}</strong></span><span>Last published <strong>{lastSavedAt || 'none this session'}</strong></span></div>
    {changedFields.length ? <details className="admin-public-config-card__changes"><summary>{changedFields.length} unsaved field{changedFields.length === 1 ? '' : 's'}</summary><div>{changedFields.map((field) => <code key={field}>{field}</code>)}</div></details> : <p className="admin-public-config-card__clean">No unsaved configuration changes.</p>}
    <div className="admin-public-config-card__actions"><button className="button" type="button" onClick={reloadFromBackend} disabled={loadState === 'loading'}>{loadState === 'loading' ? 'Reloading…' : 'Reload published config'}</button><button className="button" type="button" onClick={discardDraftAndReload} disabled={!hasDraftChanges}>Discard draft</button><button className="button button--primary" type="button" onClick={saveDraftToBackend} disabled={!canSave || !hasDraftChanges || saveState === 'saving'}>{saveState === 'saving' ? 'Publishing…' : 'Publish site changes'}</button></div>
  </section>
}
