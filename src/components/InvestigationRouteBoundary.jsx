import { Navigate, useLocation } from 'react-router-dom'
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext'
import { PublicEditProvider } from './PublicEditContext'
import { AdminNoticeProvider } from './WpAdminNotices'
import { PublicAdminToolbar } from './PublicAdminToolbar'
import { PublicEditPanel } from './PublicEditPanel'
import { InvestigationsAdminPage } from './InvestigationsAdminPage'
import { InvestigationDetailPage, InvestigationsIndexPage } from './InvestigationPages'
import { PublishingModuleGate } from './PublishingModuleGate'
import { adminRoutes } from '../routing/routes'

export function InvestigationRouteBoundary({ children }) {
  const location = useLocation()
  const path = location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/wp-admin/investigations') {
    return <PublishingModuleGate moduleId="investigations" disabledTo={adminRoutes.settings}><AdminAuthProvider><PublicEditProvider><AdminNoticeProvider><ProtectedInvestigationAdmin /></AdminNoticeProvider></PublicEditProvider></AdminAuthProvider></PublishingModuleGate>
  }
  if (path === '/investigations' || /^\/investigations\/[^/]+$/.test(path)) {
    return <PublishingModuleGate moduleId="investigations" disabledTo="/"><AdminAuthProvider><PublicEditProvider><AdminNoticeProvider><InvestigationPublicShell detail={path !== '/investigations'} /></AdminNoticeProvider></PublicEditProvider></AdminAuthProvider></PublishingModuleGate>
  }
  return children
}

function ProtectedInvestigationAdmin() {
  const location = useLocation()
  const { isAuthenticated, isChecking } = useAdminAuth()
  if (isChecking) return <main className="page admin-login-page"><section className="admin-login-panel"><p className="admin-login-panel__eyebrow">Colophon</p><h1>Checking Access</h1></section></main>
  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search || ''}${location.hash || ''}`
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }
  return <InvestigationsAdminPage />
}

function InvestigationPublicShell({ detail = false }) {
  return <div className="public-route-shell" data-live-edit-page={detail ? 'investigation' : 'investigations'} data-live-edit-family="investigations">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <PublicAdminToolbar />
    <PublicEditPanel />
    <div id="main-content" tabIndex="-1">{detail ? <InvestigationDetailPage /> : <InvestigationsIndexPage />}</div>
  </div>
}
