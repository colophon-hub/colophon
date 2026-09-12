import { useContext, useEffect, useMemo } from 'react'
import {
  Navigate,
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_NavigationContext as NavigationContext,
} from 'react-router-dom'
import App from './App'
import {
  configureColophonHostRuntime,
  resetColophonHostRuntime,
} from './host/runtime'

function normalizeBase(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === '/') return ''
  return `/${raw.replace(/^\/+|\/+$/g, '')}`
}

function stripBase(pathname, base) {
  const current = String(pathname || '/') || '/'
  if (!base) return current
  if (current === base) return '/'
  if (current.startsWith(`${base}/`)) return current.slice(base.length) || '/'
  return current
}

/**
 * Hostable Colophon publishing workspace.
 *
 * Standalone Colophon continues to render App.jsx normally. Hosts such as
 * Bondfire mount this component inside their existing router and provide the
 * current organization/session plus an org-scoped API base.
 */
export function ColophonWorkspace({
  host = null,
  adapter = null,
  session = null,
  embedded = true,
}) {
  const outerLocationContext = useContext(LocationContext)
  const outerNavigationContext = useContext(NavigationContext)

  if (!outerLocationContext || !outerNavigationContext) {
    throw new Error('ColophonWorkspace must be mounted inside a React Router.')
  }

  const runtime = configureColophonHostRuntime({
    host,
    adapter,
    session,
    embedded,
  })

  const routeBase = normalizeBase(runtime.routeBase)
  const outerLocation = outerLocationContext.location
  const relativePathname = stripBase(outerLocation.pathname, routeBase)

  const locationContext = useMemo(() => ({
    ...outerLocationContext,
    location: {
      ...outerLocation,
      pathname: relativePathname,
    },
  }), [
    outerLocationContext,
    outerLocation,
    relativePathname,
  ])

  const navigationContext = useMemo(() => ({
    ...outerNavigationContext,
    basename: routeBase || outerNavigationContext.basename || '/',
  }), [
    outerNavigationContext,
    routeBase,
  ])

  useEffect(() => () => {
    resetColophonHostRuntime()
  }, [])

  if (runtime.embedded && routeBase && outerLocation.pathname === routeBase) {
    return <Navigate to={`${routeBase}/wp-admin`} replace />
  }

  return (
    <NavigationContext.Provider value={navigationContext}>
      <LocationContext.Provider value={locationContext}>
        <App />
      </LocationContext.Provider>
    </NavigationContext.Provider>
  )
}

export default ColophonWorkspace
