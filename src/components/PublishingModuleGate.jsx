import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  getPublishingModulePrefs,
  hydratePublishingSetup,
  publishingModulesChangeEvent,
} from '../lib/publishingModules'

export function PublishingModuleGate({ moduleId, disabledTo = '/', children }) {
  const [setup, setSetup] = useState(null)

  useEffect(() => {
    let cancelled = false
    const eventName = publishingModulesChangeEvent()
    const refresh = (event) => { if (!cancelled) setSetup(event?.detail || getPublishingModulePrefs()) }
    window.addEventListener(eventName, refresh)
    hydratePublishingSetup()
      .then((next) => { if (!cancelled) setSetup(next) })
      .catch(() => { if (!cancelled) setSetup(getPublishingModulePrefs()) })
    return () => { cancelled = true; window.removeEventListener(eventName, refresh) }
  }, [])

  if (!setup) return null
  if (!setup.modules?.includes(moduleId)) return <Navigate to={disabledTo} replace />
  return children
}
