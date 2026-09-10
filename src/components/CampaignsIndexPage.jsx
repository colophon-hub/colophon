import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { loadCampaigns } from '../lib/campaignsApi'
import { EditableText } from './EditableText'
import { useResolvedConfig } from '../lib/useResolvedConfig'

export function CampaignsIndexPage() {
  const [campaigns, setCampaigns] = useState([])
  const [state, setState] = useState('loading')
  const [copied, setCopied] = useState(false)
  const resolvedConfig = useResolvedConfig()
  const publicationName = String(resolvedConfig?.identity?.publicationName || 'this publication').trim() || 'this publication'
  useEffect(() => {
    let cancelled = false
    loadCampaigns().then((items) => { if (!cancelled) { setCampaigns(items); setState('loaded') } }).catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [])
  const ordered = useMemo(() => [...campaigns].sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || dateValue(b.createdAt) - dateValue(a.createdAt)), [campaigns])
  const activeCount = ordered.filter(isActive).length
  async function shareHub() {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: `${publicationName} campaigns`, text: `Current campaigns from ${publicationName}.`, url }); return } catch { /* fall back to copy */ }
    }
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return <main className="page campaign-page campaign-directory">
    <PublicationTopbar />
    <header className="campaign-directory__hero"><div className="campaign-shell campaign-directory__hero-grid">
      <div><EditableText as="p" className="campaign-kicker" field="campaigns.index.eyebrow">CAMPAIGN DIRECTORY</EditableText><EditableText as="h1" field="campaigns.index.title">Campaign hub</EditableText></div>
      <div className="campaign-directory__intro"><EditableText as="p" field="campaigns.index.description" multiline>Find public campaigns, see what is active now, and move directly from reporting to action.</EditableText><div className="campaign-directory__share"><button type="button" onClick={shareHub}>{copied ? 'Link copied' : 'Share this hub'}</button></div></div>
    </div></header>
    <section className="campaign-directory__body"><div className="campaign-shell">
      <div className="campaign-directory__summary"><div><strong>{state === 'loaded' ? activeCount : '—'}</strong><span>Active now</span></div><div><strong>{state === 'loaded' ? ordered.length : '—'}</strong><span>Public campaigns</span></div><p>Active campaigns appear first. Inactive campaigns remain available as public archives instead of disappearing.</p></div>
      {state === 'loading' ? <p className="campaign-reader-note">Loading campaigns…</p> : null}
      {state === 'error' ? <p className="campaign-reader-note">Campaign listings are temporarily unavailable.</p> : null}
      {state === 'loaded' && !ordered.length ? <p className="campaign-reader-note">No public campaigns are listed right now.</p> : null}
      <div className="campaign-directory__grid">{ordered.map((campaign, index) => <CampaignCard campaign={campaign} index={index} key={campaign.id} />)}</div>
    </div></section>
    <PublicationFooter />
  </main>
}

function CampaignCard({ campaign, index }) {
  const active = isActive(campaign)
  const href = `/campaigns/${campaign.slug}`
  return <article className={`campaign-directory-card campaign-directory-card--${active ? 'active' : 'inactive'}`} data-campaign={campaign.slug}>
    <Link className="campaign-directory-card__art" to={href} aria-label={`Open ${campaign.title}`}>
      {campaign.heroImage ? <img src={campaign.heroImage} alt={campaign.heroAlt || ''} /> : <><span>{String(index + 1).padStart(2, '0')}</span><strong aria-hidden="true">{campaign.shortTitle || campaign.title}</strong></>}
    </Link>
    <div className="campaign-directory-card__body">
      <div className="campaign-directory-card__status"><span className={`campaign-directory-card__lifecycle is-${active ? 'active' : 'inactive'}`}>{active ? 'Active' : 'Inactive'}</span><span>{campaign.campaignType || 'campaign'}</span>{campaign.campaignStatus && campaign.campaignStatus !== (active ? 'active' : 'inactive') ? <span>{campaign.campaignStatus}</span> : null}</div>
      <p className="campaign-directory-card__age"><time dateTime={campaign.createdAt}>{formatLaunch(campaign.createdAt)}</time> · {formatCampaignAge(campaign)}</p>
      <h2><Link to={href}>{campaign.title}</Link></h2>
      <p>{directoryDescription(campaign)}</p>
      <div className="campaign-directory-card__inside"><strong>Inside this campaign</strong><ul>{directoryFeatures(campaign).map((feature) => <li key={feature}>{feature}</li>)}</ul></div>
      <div className="campaign-directory-card__actions"><Link className="campaign-button campaign-button--dark" to={href}>Open campaign →</Link>{campaign.donation?.url ? <a href={campaign.donation.url} target="_blank" rel="noreferrer">{campaign.donation.label || 'Donate'} ↗</a> : null}</div>
    </div>
  </article>
}

function isActive(campaign) { return (campaign.lifecycleStatus || (['completed', 'archived'].includes(campaign.campaignStatus) ? 'inactive' : 'active')) === 'active' }
function dateValue(value) { const date = new Date(value || 0); return Number.isFinite(date.getTime()) ? date.getTime() : 0 }
function formatLaunch(value) { const timestamp = dateValue(value); return timestamp ? `Launched ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))}` : 'Launch date unavailable' }
function formatCampaignAge(campaign) {
  if (!isActive(campaign)) return 'Public archive'
  const start = dateValue(campaign.createdAt)
  if (!start) return 'Currently running'
  const days = Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1)
  return `Running ${days} ${days === 1 ? 'day' : 'days'}`
}
function directoryDescription(campaign) { return campaign.summary || campaign.deck || 'Open the campaign for reporting, source material, updates, and ways to act.' }
function directoryFeatures(campaign) {
  const features = Array.isArray(campaign.directoryFeatures) ? campaign.directoryFeatures.filter(Boolean).slice(0, 6) : []
  return features.length ? features : ['Reporting and context', 'Campaign updates', 'Sources and ways to act']
}
