import { useEffect, useMemo, useState } from 'react'
import { isLocalRuntime } from '../lib/runtime'

async function request(url, init) {
  const response = await fetch(url, { credentials: 'same-origin', ...init })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) throw new Error(data.error || `Signing request failed (${response.status})`)
  return data
}

export function CampaignSignatures({ campaign }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ signerType: 'individual', displayName: '', organizationName: '', contactName: '', affiliation: '', role: '', website: '', publicStatement: '', email: '', company: '', formStartedAt: Date.now() })
  const managementToken = useMemo(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('manage-signature') || '', [])
  const [managed, setManaged] = useState(null)
  const [managedDraft, setManagedDraft] = useState(null)

  useEffect(() => {
    if (!campaign?.id) return
    request(`/api/campaign-signatures?action=public&campaign=${encodeURIComponent(campaign.id)}`)
      .then((next) => { setData(next); setState('ready') })
      .catch(() => setState('unavailable'))
  }, [campaign?.id])

  useEffect(() => {
    if (!managementToken) return
    request(`/api/campaign-signatures?action=manage&token=${encodeURIComponent(managementToken)}`)
      .then((next) => { setManaged(next.item); setManagedDraft(next.item); setNotice('This private link controls only your signature.') })
      .catch((error) => setNotice(error.message))
  }, [managementToken])

  if (state !== 'ready' || !data?.form?.enabled) return null
  const config = data.form.config || {}

  async function submit(event) {
    event.preventDefault()
    setState('submitting'); setNotice('')
    try {
      const next = await request('/api/campaign-signatures?action=submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, campaign: campaign.id }) })
      setNotice(next.message || 'Check your email.')
      setState('ready')
      setForm((current) => ({ ...current, email: '', publicStatement: '', formStartedAt: Date.now() }))
    } catch (error) { setNotice(error.message); setState('ready') }
  }

  async function saveManaged(patch = {}) {
    try {
      const next = await request('/api/campaign-signatures?action=manage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: managementToken, patch: { ...managedDraft, ...patch } }) })
      setManaged(next.item); setManagedDraft(next.item)
      setNotice(patch.revoke || patch.hidden ? 'Your signature is no longer public.' : 'Your signature was updated.')
      const publicData = await request(`/api/campaign-signatures?action=public&campaign=${encodeURIComponent(campaign.id)}`)
      setData(publicData)
    } catch (error) { setNotice(error.message) }
  }

  return <section className="campaign-section campaign-section--signatures" id="sign"><div className="campaign-shell">
    <h2>{data.form.title || 'Sign'}</h2>
    {data.form.intro ? <p>{data.form.intro}</p> : null}
    <p><strong>{data.counts?.total || 0}</strong> approved signatures</p>
    {data.items?.length ? <div className="campaign-signature-list">{data.items.map((item) => <article key={item.id}><h3>{item.organizationName || item.displayName}</h3>{item.affiliation ? <p>{item.affiliation}</p> : null}{item.publicStatement ? <blockquote>{item.publicStatement}</blockquote> : null}{item.website ? <a href={item.website}>Website</a> : null}</article>)}</div> : null}

    {managementToken && managedDraft ? <section className="wp-meta-box"><h3>Manage your signature</h3><p className="description">This accountless management link is private. It does not expose your email address and can edit or withdraw only this signature.</p><div className="wp-settings-form">
      {managedDraft.signerType === 'organization' ? <label><span>Organization name</span><input value={managedDraft.organizationName || ''} onChange={(event) => setManagedDraft((current) => ({ ...current, organizationName: event.target.value }))} /></label> : <label><span>Public name</span><input value={managedDraft.displayName || ''} onChange={(event) => setManagedDraft((current) => ({ ...current, displayName: event.target.value }))} /></label>}
      <label><span>Affiliation / location</span><input value={managedDraft.affiliation || ''} onChange={(event) => setManagedDraft((current) => ({ ...current, affiliation: event.target.value }))} /></label>
      <label><span>Public statement</span><textarea rows="3" value={managedDraft.publicStatement || ''} onChange={(event) => setManagedDraft((current) => ({ ...current, publicStatement: event.target.value }))} /></label>
    </div><div className="review-card__actions"><button className="button button--primary" type="button" onClick={() => saveManaged()}>Save signature</button><button className="button" type="button" onClick={() => saveManaged({ hidden: true })}>Hide / withdraw signature</button></div><p className="description">Current state: {managed?.status || 'unknown'}</p></section> : null}

    {!managementToken ? <form onSubmit={submit} className="wp-settings-form">
      <label><span>Signing as</span><select value={form.signerType} onChange={(event) => setForm((current) => ({ ...current, signerType: event.target.value }))}>{config.allowIndividuals !== false ? <option value="individual">Individual</option> : null}{config.allowOrganizations !== false ? <option value="organization">Organization</option> : null}</select></label>
      {form.signerType === 'organization' ? <><label><span>Organization</span><input required value={form.organizationName} onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value }))} /></label><label><span>Contact name (not published)</span><input required value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} /></label></> : <label><span>Public name</span><input required value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} /></label>}
      <label><span>Email (verification only, never published)</span><input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
      {config.showAffiliation !== false ? <label><span>Affiliation / location</span><input value={form.affiliation} onChange={(event) => setForm((current) => ({ ...current, affiliation: event.target.value }))} /></label> : null}
      {config.allowStatement !== false ? <label><span>Public statement (optional)</span><textarea rows="3" value={form.publicStatement} onChange={(event) => setForm((current) => ({ ...current, publicStatement: event.target.value }))} /></label> : null}
      <input type="text" name="company" value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} tabIndex="-1" autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }} />
      <button className="button button--primary" disabled={state === 'submitting'}>{state === 'submitting' ? 'Sending…' : 'Sign and verify by email'}</button>
    </form> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </div></section>
}

export function CampaignSignaturesAdmin({ campaign }) {
  const local = isLocalRuntime()
  const [form, setForm] = useState({ enabled: false, title: 'Sign', intro: '', config: { allowIndividuals: true, allowOrganizations: true, showAffiliation: true, allowStatement: true } })
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [notice, setNotice] = useState('')

  async function load() {
    if (!campaign?.id || local) return
    try { const next = await request(`/api/campaign-signatures?action=queue&campaign=${encodeURIComponent(campaign.id)}`); if (next.form) setForm(next.form); setItems(next.items || []); setSelected(new Set()) } catch (error) { setNotice(error.message) }
  }
  useEffect(() => { load() }, [campaign?.id, local])

  if (!campaign?.id) return null
  if (local) return <section className="wp-meta-box"><h2>Verified campaign signatures</h2><p className="description">Email-verified public signing is available on shared/server installations. Local publications can still use the campaign's static signatory list.</p></section>

  async function configure() {
    try { const next = await request('/api/campaign-signatures?action=configure', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaign: campaign.id, form }) }); setForm(next.form); setNotice('Signing settings saved.') } catch (error) { setNotice(error.message) }
  }
  async function moderate(id, moderationAction) {
    try { await request('/api/campaign-signatures?action=moderate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaign: campaign.id, id, moderationAction }) }); await load() } catch (error) { setNotice(error.message) }
  }
  async function bulk(moderationAction) {
    if (!selected.size) return
    try { await request('/api/campaign-signatures?action=bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaign: campaign.id, ids: [...selected], moderationAction }) }); setNotice(`${moderationAction} applied to ${selected.size} signatures.`); await load() } catch (error) { setNotice(error.message) }
  }
  async function resend(id) {
    try { await request('/api/campaign-signatures?action=resend', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaign: campaign.id, id }) }); setNotice('Replacement verification email sent.'); await load() } catch (error) { setNotice(error.message) }
  }
  async function legacy() {
    try { const next = await request('/api/campaign-signatures?action=import-legacy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaign: campaign.id, items: campaign.signatories || [] }) }); setNotice(`Imported ${next.imported || 0} legacy signers.`); await load() } catch (error) { setNotice(error.message) }
  }
  function toggle(id) { setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next }) }

  return <section className="wp-meta-box"><h2>Verified campaign signatures</h2><p className="description">Optional email-verified signing. Public counts include approved signatures only.</p>
    <label className="campaign-admin-check"><input type="checkbox" checked={Boolean(form.enabled)} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} /> Enable public signing</label>
    <div className="wp-settings-form"><label><span>Form title</span><input value={form.title || ''} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label><label><span>Intro</span><textarea rows="2" value={form.intro || ''} onChange={(event) => setForm((current) => ({ ...current, intro: event.target.value }))} /></label></div>
    <div className="review-card__actions"><button className="button button--primary" type="button" onClick={configure}>Save signing settings</button><button className="button" type="button" onClick={legacy}>Import existing static signatories</button><a className="button" href={`/api/campaign-signatures?action=export&campaign=${encodeURIComponent(campaign.id)}`}>Export CSV</a>{selected.size ? <><button className="button" type="button" onClick={() => bulk('approve')}>Approve selected</button><button className="button" type="button" onClick={() => bulk('reject')}>Reject selected</button><button className="button" type="button" onClick={() => bulk('revoke')}>Remove selected</button></> : null}</div>
    {notice ? <p role="status">{notice}</p> : null}
    {items.length ? <div className="wp-list-table-wrap"><table className="wp-list-table widefat striped"><thead><tr><th>Select</th><th>Signer</th><th>Email</th><th>Status</th><th>Signals</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Select ${item.organizationName || item.displayName}`} /></td><td>{item.organizationName || item.displayName}</td><td>{item.email}</td><td>{item.status}</td><td>{[...(item.duplicateFlags || []), ...(item.abuseFlags || [])].join(', ') || 'none'}</td><td><button className="button" type="button" onClick={() => moderate(item.id, 'approve')}>Approve</button> <button className="button" type="button" onClick={() => moderate(item.id, 'reject')}>Reject</button> <button className="button" type="button" onClick={() => moderate(item.id, 'revoke')}>Remove</button>{item.status === 'pending_email' ? <> <button className="button" type="button" onClick={() => resend(item.id)}>Resend verification</button></> : null}</td></tr>)}</tbody></table></div> : <p className="description">No submitted signatures.</p>}
  </section>
}
