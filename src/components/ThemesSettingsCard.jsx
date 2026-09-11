import { useState } from 'react'
import { activateTheme, activeTheme, installTheme, normalizeThemeState, removeTheme, themePackageJson } from '../../shared/themeFormat.js'
import { emitExtensionEvent } from '../../shared/extensionHooks.js'
import { usePublicEdit } from './PublicEditContext'

function downloadText(name, content) { const blob = new Blob([content], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }

export function ThemesSettingsCard() {
  const { effectiveConfig, updateThemes } = usePublicEdit()
  const state = normalizeThemeState(effectiveConfig?.themes); const current = activeTheme(state)
  const [message, setMessage] = useState('')
  async function importTheme(event) { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { const raw = JSON.parse(await file.text()); updateThemes(installTheme(state, raw)); setMessage(`Installed ${raw.name || raw.id}. Publish site changes to save it.`) } catch (error) { setMessage(`Theme import failed: ${String(error?.message || error)}`) } }
  function activate(id) { const next = activateTheme(state, id); updateThemes(next); emitExtensionEvent('theme:activated', { themeId: id, previousThemeId: state.activeId }); setMessage(`Activated ${id} in this settings draft. Publish site changes to make it live.`) }
  function remove(id) { try { updateThemes(removeTheme(state, id)); setMessage(`Removed ${id} from this settings draft.`) } catch (error) { setMessage(String(error?.message || error)) } }
  return <section className="wp-meta-box" aria-labelledby="themes-settings-title">
    <h2 id="themes-settings-title">Themes</h2>
    <p className="description">Themes change presentation without changing publication content. Packages are declarative JSON and cannot contain executable server code.</p>
    <p><strong>Active theme:</strong> {current.name} <span className="description">v{current.version}</span></p>
    <div className="colophon-theme-list">{state.installed.map((theme) => <article className="colophon-theme-card" key={theme.id}><div><strong>{theme.name}</strong><div className="description">{theme.description || 'No description'} · {theme.author || 'Unknown author'} · {theme.version}</div></div><div className="review-card__actions">{state.activeId !== theme.id ? <button className="button" type="button" onClick={() => activate(theme.id)}>Activate</button> : <span className="notice notice-success">Active</span>}{!theme.builtIn ? <button className="button" type="button" onClick={() => downloadText(`${theme.id}-${theme.version}.colophon-theme.json`, themePackageJson(theme))}>Export</button> : null}{!theme.builtIn && state.activeId !== theme.id ? <button className="button button-link-delete" type="button" onClick={() => remove(theme.id)}>Remove</button> : null}</div></article>)}</div>
    <label className="button">Import theme<input hidden type="file" accept=".json,application/json" onChange={importTheme} /></label>
    {message ? <p className="description" role="status">{message}</p> : null}
  </section>
}
