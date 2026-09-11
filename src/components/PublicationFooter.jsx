import { Link } from 'react-router-dom'
import { EditableLink } from './EditableLink'
import { EditableText } from './EditableText'
import { editableContentRegistry } from '../lib/editableContentRegistry'
import { useAdminAuth } from './AdminAuthContext'
import { publicRoutes } from '../routing/routes'
import { SHOW_FEATURED_CAMPAIGN_LINKS } from '../config/campaignVisibility'
import { getFeaturedPublicProjects } from '../lib/projectCatalog'
import { useResolvedConfig } from '../lib/useResolvedConfig'

export function PublicationFooter() {
  const footer = editableContentRegistry.footer
  const { isAuthenticated, isChecking } = useAdminAuth()
  const projects = getFeaturedPublicProjects()
  const config = useResolvedConfig()
  const identity = config?.identity || {}
  const indieweb = config?.indieweb || {}
  const publicationName = String(identity.publicationName || 'Independent Publication').trim() || 'Independent Publication'
  const footerIdentity = String(identity.footerIdentity || publicationName).trim() || publicationName
  const footerText = String(identity.footerText || '').trim()

  return (
    <footer className="publication-footer">
      <div className="publication-footer__top">
        <div className="publication-footer__brand h-card">
          <EditableText as="div" className="publication-footer__eyebrow" field={footer.eyebrow.field}>
            {footer.eyebrow.defaultText}
          </EditableText>
          {identity.logoUrl ? <img className="u-photo indieweb-meta" src={identity.logoUrl} alt="" /> : null}
          {identity.siteUrl ? <a className="u-url" href={identity.siteUrl}><h2 className="p-name">{footerIdentity}</h2></a> : <h2 className="p-name">{footerIdentity}</h2>}
          {footerText ? (
            <div className="publication-footer__body">{footerText}</div>
          ) : (
            <EditableText as="div" className="publication-footer__body" field={footer.body.field} multiline>
              {footer.body.defaultText}
            </EditableText>
          )}
        </div>

        {footer.sections.map((section) => (
          <div className="publication-footer__section" key={section.id}>
            {section.id === 'formats' ? (
              <EditableText as="h3" field="footer.projects.title">Projects</EditableText>
            ) : (
              <EditableText as="h3" field={section.titleField}>
                {section.defaultTitle}
              </EditableText>
            )}
            <nav>
              {section.id === 'formats' ? (
                projects.map((project) => (
                  <Link key={project.slug} to={`/archive?project=${encodeURIComponent(project.slug)}`}>
                    {project.name}
                  </Link>
                ))
              ) : (
                section.links.map((link) => (
                  <EditableLink
                    defaultHref={link.defaultHref}
                    defaultLabel={link.defaultLabel}
                    hrefField={link.hrefField}
                    key={link.id}
                    labelField={link.labelField}
                  />
                ))
              )}
              {section.id === 'site' && SHOW_FEATURED_CAMPAIGN_LINKS ? <EditableLink className="publication-footer__campaign-link" labelField="footer.site.campaign.label" hrefField="footer.site.campaign.href" defaultLabel="Featured Campaign" defaultHref={publicRoutes.featuredCampaign} /> : null}
              {section.id === 'site' ? <EditableLink labelField="footer.site.gallery.label" hrefField="footer.site.gallery.href" defaultLabel="Gallery" defaultHref="/gallery" /> : null}
            </nav>
          </div>
        ))}
      </div>

      <div className="publication-footer__bottom">
        <div className="publication-footer__software">{publicationName} · Powered by Colophon</div>
        {(indieweb.relMe || []).length ? <div className="publication-footer__identity-links" aria-label="Verified identity links">{indieweb.relMe.map((href) => <a key={href} href={href} rel="me noopener noreferrer">{(() => { try { return new URL(href).hostname } catch { return href } })()}</a>)}</div> : null}
        <EditableText as="div" field={footer.bottom.field} multiline>
          {footer.bottom.defaultText}
        </EditableText>
        {!isChecking && !isAuthenticated ? (
          <Link className="publication-footer__login-link" to="/login">Editor login</Link>
        ) : null}
      </div>
    </footer>
  )
}
