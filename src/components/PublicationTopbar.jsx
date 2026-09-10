import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { getConfiguredBlock } from '../lib/publicConfig'
import {
  getPublishingModulePrefs,
  hydratePublishingSetup,
  publishingModulesChangeEvent,
} from '../lib/publishingModules'
import { resolveVisibleNavigation } from '../../shared/publicNavigationModel.js'
import { PublicTypographyRuntime } from './PublicTypographyRuntime'

function PublicNavLink({ item }) {
  if (item.href.startsWith('/')) return <Link to={item.href}>{item.label}</Link>
  const external = /^https?:\/\//i.test(item.href)
  return <a href={item.href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{item.label}</a>
}

export function PublicationTopbar() {
  const location = useLocation()
  const resolvedConfig = useResolvedConfig()
  const masthead = getConfiguredBlock(resolvedConfig, 'site.masthead') || {}
  const identity = resolvedConfig?.identity || {}
  const siteTitle = String(identity.publicationName || 'Independent Publication').trim() || 'Independent Publication'
  const configuredLogo = String(identity.logoUrl || masthead.logoUrl || '').trim()
  const mastheadSize = ['compact', 'medium', 'large'].includes(masthead.size) ? masthead.size : 'medium'
  const isHome = location.pathname === '/'
  const resolvedMastheadSize = isHome ? mastheadSize : 'compact'
  const [modulePrefs, setModulePrefs] = useState(() => getPublishingModulePrefs())

  useEffect(() => {
    const eventName = publishingModulesChangeEvent()
    const refresh = (event) => setModulePrefs(event?.detail || getPublishingModulePrefs())
    window.addEventListener(eventName, refresh)
    hydratePublishingSetup().then(setModulePrefs).catch(() => {})
    return () => window.removeEventListener(eventName, refresh)
  }, [])

  const navItems = resolveVisibleNavigation(resolvedConfig?.navigation, modulePrefs?.modules || [])

  return (
    <header className={`publication-topbar publication-topbar--masthead publication-topbar--${resolvedMastheadSize}${isHome ? ' publication-topbar--home' : ' publication-topbar--inner'}`}>
      <PublicTypographyRuntime />
      <div className="publication-topbar__inner">
        <div className="publication-topbar__brand">
          <Link
            to="/"
            className="publication-topbar__brand-link publication-topbar__brand-link--isolated"
            aria-label={`${siteTitle} home`}
            title={siteTitle}
          >
            {configuredLogo ? (
              <img
                className="publication-topbar__brand-image publication-topbar__brand-image--isolated"
                src={configuredLogo}
                alt={siteTitle}
              />
            ) : (
              <span className="publication-topbar__site-name">{siteTitle}</span>
            )}
          </Link>

          {navItems.length ? (
            <nav className="publication-topbar__nav" aria-label={`${siteTitle} primary navigation`}>
              {navItems.map((item) => <PublicNavLink item={item} key={item.id} />)}
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  )
}
