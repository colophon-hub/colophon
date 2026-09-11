import { useEffect, useState } from 'react'
import { getUiAppearance, initializeUiAppearance, setUiAppearance, subscribeUiAppearance } from '../lib/uiAppearance'

export function AppearanceSettingsCard() {
  const [preference, setPreference] = useState(() => getUiAppearance())
  const [resolved, setResolved] = useState(() => document.documentElement.dataset.uiTheme || 'light')

  useEffect(() => {
    initializeUiAppearance()
    setResolved(document.documentElement.dataset.uiTheme || 'light')
    return subscribeUiAppearance((state) => {
      setPreference(state.preference)
      setResolved(state.resolved)
    })
  }, [])

  return <section className="wp-meta-box" aria-labelledby="appearance-settings-title">
    <h2 id="appearance-settings-title">Appearance</h2>
    <p className="description">Choose how Colophon looks on this device. Only this interface preference is stored locally.</p>
    <label className="native-content-editor__field">
      <span>Color mode</span>
      <select value={preference} onChange={(event) => setUiAppearance(event.target.value)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    <p className="description" role="status">Currently rendered in {resolved} mode.</p>
  </section>
}
