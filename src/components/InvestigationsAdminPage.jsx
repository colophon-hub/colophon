import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { deleteInvestigation, loadInvestigations, saveInvestigation } from '../lib/investigationsApi'
import {
  blankInvestigation,
  EVIDENCE_STATES,
  INVESTIGATION_PUBLICATION_STATUSES,
  INVESTIGATION_STATUSES,
  normalizeInvestigationRelation,
  normalizeRecordsRequest,
  normalizeSource,
  normalizeTimelineEvent,
  RECORDS_REQUEST_STATUSES,
  RECORDS_REQUEST_TYPES,
  slugifyInvestigation,
  SOURCE_TYPES,
} from '../../shared/investigationModel.js'

export function InvestigationsAdminPage() {
  const [items, setItems] = useState([])
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [slugLocked, setSlugLocked] = useState(false)
  const fingerprint = useMemo(() => JSON.stringify(draft || null), [draft])
  const [savedFingerprint, setSavedFingerprint] = useState('')
  const dirty = Boolean(draft) && fingerprint !== savedFingerprint

  useEffect(() => {
    let cancelled = false
    loadInvestigations({ includeDrafts: true }).then((next) => {
      if (cancelled) return
      setItems(next)
      const first = next[0] || null
      setDraft(first)
      setSavedFingerprint(JSON.stringify(first || null))
      setSlugLocked(Boolean(first))
    }).catch((cause) => setError(String(cause?.message || cause))).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const warn = (event) => { if (!dirty) return; event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function canDiscard() { return !dirty || window.confirm('Discard unsaved investigation changes?') }
  function select(item) { if (canDiscard()) { setDraft(item); setSavedFingerprint(JSON.stringify(item)); setSlugLocked(true); setMessage(''); setError('') } }
  function startNew() { if (canDiscard()) { const next = blankInvestigation(); setDraft(next); setSavedFingerprint(JSON.stringify(next)); setSlugLocked(false); setMessage(''); setError('') } }
  function patch(value) { setDraft((current) => ({ ...current, ...value })) }
  function patchTitle(title) { setDraft((current) => ({ ...current, title, ...(!slugLocked ? { slug: slugifyInvestigation(title) } : {}) })) }
  function patchList(section, index, key, value) { setDraft((current) => ({ ...current, [section]: current[section].map((item, rowIndex) => rowIndex === index ? { ...item, [key]: value } : item) })) }
  function removeAt(section, index) { setDraft((current) => ({ ...current, [section]: current[section].filter((_, rowIndex) => rowIndex !== index) })) }

  async function save() {
    if (!draft?.title?.trim()) { setError('Title is required.'); return }
    if (!draft?.slug?.trim()) { setError('Slug is required.'); return }
    try {
      setSaving(true); setError(''); setMessage('')
      const saved = await saveInvestigation(draft)
      setDraft(saved); setSavedFingerprint(JSON.stringify(saved)); setSlugLocked(true)
      setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
      setMessage('Investigation saved.')
    } catch (cause) { setError(String(cause?.message || cause)) } finally { setSaving(false) }
  }

  async function remove() {
    if (!draft || !items.some((item) => item.id === draft.id) || !window.confirm(`Delete “${draft.title}”? This removes the investigation hub and its revision history.`)) return
    try {
      setSaving(true); setError(''); setMessage(''); await deleteInvestigation(draft.id)
      const remaining = items.filter((item) => item.id !== draft.id); setItems(remaining)
      const next = remaining[0] || null; setDraft(next); setSavedFingerprint(JSON.stringify(next || null)); setSlugLocked(Boolean(next)); setMessage('Investigation deleted.')
    } catch (cause) { setError(String(cause?.message || cause)) } finally { setSaving(false) }
  }

  return <AdminFrame><main className="investigation-admin">
    <header className="investigation-admin__header"><div><p className="investigation-admin__eyebrow">REPORTING</p><h1>Investigations</h1><p>Build living evidence hubs around reporting without hard-coding a story or agency into the application.</p></div><div className="investigation-admin__header-actions"><Link to="/investigations">View public directory</Link><button type="button" onClick={startNew}>New investigation</button></div></header>
    {message ? <p className="investigation-admin__notice is-success" role="status">{message}</p> : null}
    {error ? <p className="investigation-admin__notice is-error" role="alert">{error}</p> : null}
    <div className="investigation-admin__layout">
      <aside className="investigation-admin__list" aria-label="Investigations">{loading ? <p>Loading…</p> : null}{!loading && !items.length ? <p>No investigations yet.</p> : null}{items.map((item) => <button type="button" className={draft?.id === item.id ? 'is-active' : ''} onClick={() => select(item)} key={item.id}><strong>{item.title || 'Untitled'}</strong><span>{item.publicationStatus} · {item.status}</span></button>)}</aside>
      <section className="investigation-admin__editor">
        {!draft ? <div className="investigation-admin__empty"><h2>Create the first investigation</h2><button type="button" onClick={startNew}>New investigation</button></div> : <>
          <div className="investigation-admin__savebar"><div><strong>{dirty ? 'Unsaved changes' : 'Saved'}</strong><span>{draft.publicationStatus === 'published' ? `Public at /investigations/${draft.slug}` : 'Not public yet'}</span></div><div>{items.some((item) => item.id === draft.id) ? <button type="button" className="is-danger" onClick={remove} disabled={saving}>Delete</button> : null}<button type="button" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save investigation'}</button></div></div>

          <AdminSection title="Identity + status">
            <Field label="Title"><input value={draft.title} onChange={(event) => patchTitle(event.target.value)} /></Field>
            <Field label="Slug"><input value={draft.slug} onChange={(event) => { setSlugLocked(true); patch({ slug: slugifyInvestigation(event.target.value) }) }} /></Field>
            <div className="investigation-admin__two"><Field label="Public visibility"><select value={draft.publicationStatus} onChange={(event) => patch({ publicationStatus: event.target.value })}>{INVESTIGATION_PUBLICATION_STATUSES.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field><Field label="Investigation status"><select value={draft.status} onChange={(event) => patch({ status: event.target.value })}>{INVESTIGATION_STATUSES.map((value) => <option value={value} key={value}>{labelStatus(value)}</option>)}</select></Field></div>
            <Field label="Deck"><textarea rows="3" value={draft.deck} onChange={(event) => patch({ deck: event.target.value })} /></Field>
            <Field label="Hero image URL"><input value={draft.heroImage} onChange={(event) => patch({ heroImage: event.target.value })} /></Field>
            <Field label="Hero alt text"><textarea rows="2" value={draft.heroAlt} onChange={(event) => patch({ heroAlt: event.target.value })} /></Field>
          </AdminSection>

          <AdminSection title="Reader orientation">
            <Field label="Explainer"><textarea rows="5" value={draft.explainer} onChange={(event) => patch({ explainer: event.target.value })} placeholder="What is this page and what does it contain?" /></Field>
            <Field label="How to use this page"><textarea rows="4" value={draft.howToUse} onChange={(event) => patch({ howToUse: event.target.value })} /></Field>
            <Field label="One-minute summary"><textarea rows="6" value={draft.summary} onChange={(event) => patch({ summary: event.target.value })} /></Field>
            <Field label="Main question"><textarea rows="3" value={draft.question} onChange={(event) => patch({ question: event.target.value })} /></Field>
            <Field label="Why it matters / stakes"><textarea rows="5" value={draft.stakes} onChange={(event) => patch({ stakes: event.target.value })} /></Field>
            <Field label="Decision tree / reporting map"><textarea rows="6" value={draft.decisionTree} onChange={(event) => patch({ decisionTree: event.target.value })} /></Field>
          </AdminSection>

          <ListSection title="Sources + receipts" items={draft.sources} onAdd={() => patch({ sources: [...draft.sources, normalizeSource({ title: '', evidenceState: 'DOCUMENTED' })] })} onRemove={(index) => removeAt('sources', index)} render={(source, index) => <>
            <div className="investigation-admin__two"><Field label="Title"><input value={source.title} onChange={(event) => patchList('sources', index, 'title', event.target.value)} /></Field><Field label="Type"><select value={source.type} onChange={(event) => patchList('sources', index, 'type', event.target.value)}>{SOURCE_TYPES.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field></div>
            <div className="investigation-admin__two"><Field label="Publisher / agency / account"><input value={source.publisher} onChange={(event) => patchList('sources', index, 'publisher', event.target.value)} /></Field><Field label="Evidence state"><select value={source.evidenceState} onChange={(event) => patchList('sources', index, 'evidenceState', event.target.value)}>{EVIDENCE_STATES.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field></div>
            <Field label="Original URL"><input value={source.originalUrl} onChange={(event) => patchList('sources', index, 'originalUrl', event.target.value)} /></Field><Field label="Archive URL"><input value={source.archiveUrl} onChange={(event) => patchList('sources', index, 'archiveUrl', event.target.value)} /></Field><Field label="Document / media URL"><input value={source.attachmentUrl} onChange={(event) => patchList('sources', index, 'attachmentUrl', event.target.value)} /></Field><Field label="Excerpt"><textarea rows="3" value={source.excerpt} onChange={(event) => patchList('sources', index, 'excerpt', event.target.value)} /></Field><Field label="Notes / why it matters"><textarea rows="3" value={source.notes} onChange={(event) => patchList('sources', index, 'notes', event.target.value)} /></Field>
          </>} />

          <ListSection title="Timeline" items={draft.timeline} onAdd={() => patch({ timeline: [...draft.timeline, normalizeTimelineEvent({ title: '', evidenceState: 'DOCUMENTED' })] })} onRemove={(index) => removeAt('timeline', index)} render={(event, index) => <>
            <div className="investigation-admin__two"><Field label="Date"><input type="date" value={event.date} onChange={(input) => patchList('timeline', index, 'date', input.target.value)} /></Field><Field label="Evidence state"><select value={event.evidenceState} onChange={(input) => patchList('timeline', index, 'evidenceState', input.target.value)}>{EVIDENCE_STATES.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field></div><Field label="Title"><input value={event.title} onChange={(input) => patchList('timeline', index, 'title', input.target.value)} /></Field><Field label="Description"><textarea rows="4" value={event.body} onChange={(input) => patchList('timeline', index, 'body', input.target.value)} /></Field><Field label="Related claim"><textarea rows="2" value={event.relatedClaim} onChange={(input) => patchList('timeline', index, 'relatedClaim', input.target.value)} /></Field>
          </>} />

          <ListSection title="Public records desk" items={draft.recordsRequests} onAdd={() => patch({ recordsRequests: [...draft.recordsRequests, normalizeRecordsRequest({ title: '', status: 'Drafting', requestType: 'other' })] })} onRemove={(index) => removeAt('recordsRequests', index)} render={(request, index) => <>
            <div className="investigation-admin__two"><Field label="Request title"><input value={request.title} onChange={(event) => patchList('recordsRequests', index, 'title', event.target.value)} /></Field><Field label="Status"><select value={request.status} onChange={(event) => patchList('recordsRequests', index, 'status', event.target.value)}>{RECORDS_REQUEST_STATUSES.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field></div>
            <div className="investigation-admin__two"><Field label="Request type / law"><select value={request.requestType} onChange={(event) => patchList('recordsRequests', index, 'requestType', event.target.value)}>{RECORDS_REQUEST_TYPES.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field><Field label="Law name (optional)"><input value={request.lawName} onChange={(event) => patchList('recordsRequests', index, 'lawName', event.target.value)} /></Field></div>
            <div className="investigation-admin__two"><Field label="Agency"><input value={request.agency} onChange={(event) => patchList('recordsRequests', index, 'agency', event.target.value)} /></Field><Field label="Jurisdiction"><input value={request.jurisdiction} onChange={(event) => patchList('recordsRequests', index, 'jurisdiction', event.target.value)} placeholder="Federal, state, county, city…" /></Field></div>
            <div className="investigation-admin__two"><Field label="Request method"><input value={request.requestMethod} onChange={(event) => patchList('recordsRequests', index, 'requestMethod', event.target.value)} placeholder="Portal, email, mail…" /></Field><Field label="Request URL"><input value={request.requestUrl} onChange={(event) => patchList('recordsRequests', index, 'requestUrl', event.target.value)} /></Field></div>
            <Field label="Description / scope"><textarea rows="4" value={request.description} onChange={(event) => patchList('recordsRequests', index, 'description', event.target.value)} /></Field>
            <div className="investigation-admin__two"><Field label="Submitted date"><input type="date" value={request.submittedDate} onChange={(event) => patchList('recordsRequests', index, 'submittedDate', event.target.value)} /></Field><Field label="Tracking / reference number"><input value={request.trackingNumber} onChange={(event) => patchList('recordsRequests', index, 'trackingNumber', event.target.value)} /></Field></div>
            <div className="investigation-admin__two"><Field label="Statutory due date"><input type="date" value={request.statutoryDueDate} onChange={(event) => patchList('recordsRequests', index, 'statutoryDueDate', event.target.value)} /></Field><Field label="Follow-up date"><input type="date" value={request.followUpDate} onChange={(event) => patchList('recordsRequests', index, 'followUpDate', event.target.value)} /></Field></div>
            <div className="investigation-admin__two"><Field label="Response date"><input type="date" value={request.responseDate} onChange={(event) => patchList('recordsRequests', index, 'responseDate', event.target.value)} /></Field><Field label="Fee status"><input value={request.feeStatus} onChange={(event) => patchList('recordsRequests', index, 'feeStatus', event.target.value)} /></Field></div>
            <Field label="Appeal status"><input value={request.appealStatus} onChange={(event) => patchList('recordsRequests', index, 'appealStatus', event.target.value)} /></Field><Field label="Expected next step"><input value={request.expectedNextStep} onChange={(event) => patchList('recordsRequests', index, 'expectedNextStep', event.target.value)} /></Field>
            <Field label="Responsive records summary"><textarea rows="3" value={request.responsiveDocuments} onChange={(event) => patchList('recordsRequests', index, 'responsiveDocuments', event.target.value)} /></Field><Field label="Exemptions / redactions"><textarea rows="3" value={request.exemptionsRedactions} onChange={(event) => patchList('recordsRequests', index, 'exemptionsRedactions', event.target.value)} /></Field>
            <Field label="Related source IDs (one per line)"><textarea rows="3" value={(request.sourceIds || []).join('\n')} onChange={(event) => patchList('recordsRequests', index, 'sourceIds', lines(event.target.value))} /></Field><Field label="Source attachments (one URL per line)"><textarea rows="3" value={(request.attachmentUrls || []).join('\n')} onChange={(event) => patchList('recordsRequests', index, 'attachmentUrls', lines(event.target.value))} /></Field>
            <Field label="Public notes"><textarea rows="4" value={request.publicNotes} onChange={(event) => patchList('recordsRequests', index, 'publicNotes', event.target.value)} /></Field><Field label="Internal notes"><textarea rows="4" value={request.internalNotes} onChange={(event) => patchList('recordsRequests', index, 'internalNotes', event.target.value)} /></Field>
          </>} />

          <ListSection title="Related reporting, campaigns, people + institutions" items={draft.relations} onAdd={() => patch({ relations: [...draft.relations, normalizeInvestigationRelation({ targetType: 'post', relationType: 'related' })] })} onRemove={(index) => removeAt('relations', index)} render={(relation, index) => <>
            <div className="investigation-admin__two"><Field label="Target type"><select value={relation.targetType} onChange={(event) => patchList('relations', index, 'targetType', event.target.value)}><option value="post">Article / post</option><option value="campaign">Campaign</option><option value="investigation">Investigation</option><option value="person">Person</option><option value="institution">Institution</option><option value="publication">Publication</option></select></Field><Field label="Relation type"><input value={relation.relationType} onChange={(event) => patchList('relations', index, 'relationType', event.target.value)} /></Field></div><Field label="Label"><input value={relation.label} onChange={(event) => patchList('relations', index, 'label', event.target.value)} /></Field><Field label="Target slug / ID"><input value={relation.targetSlug || relation.targetId} onChange={(event) => patchList('relations', index, 'targetSlug', event.target.value)} /></Field><Field label="External URL (optional)"><input value={relation.href} onChange={(event) => patchList('relations', index, 'href', event.target.value)} /></Field><Field label="Note"><textarea rows="2" value={relation.note} onChange={(event) => patchList('relations', index, 'note', event.target.value)} /></Field>
          </>} />

          <ListSection title="Open questions" items={draft.openQuestions} onAdd={() => patch({ openQuestions: [...draft.openQuestions, { id: itemId('question'), text: '', state: 'open' }] })} onRemove={(index) => removeAt('openQuestions', index)} render={(question, index) => <Field label="Question"><textarea rows="3" value={question.text} onChange={(event) => patchList('openQuestions', index, 'text', event.target.value)} /></Field>} />
          <ListSection title="Update log" items={draft.updateLog} onAdd={() => patch({ updateLog: [...draft.updateLog, { id: itemId('update'), date: '', title: '', body: '' }] })} onRemove={(index) => removeAt('updateLog', index)} render={(update, index) => <><div className="investigation-admin__two"><Field label="Date"><input type="date" value={update.date} onChange={(event) => patchList('updateLog', index, 'date', event.target.value)} /></Field><Field label="Title"><input value={update.title} onChange={(event) => patchList('updateLog', index, 'title', event.target.value)} /></Field></div><Field label="What changed"><textarea rows="3" value={update.body} onChange={(event) => patchList('updateLog', index, 'body', event.target.value)} /></Field></>} />
        </>}
      </section>
    </div>
  </main></AdminFrame>
}

function AdminSection({ title, children }) { return <section className="investigation-admin__section"><h2>{title}</h2>{children}</section> }
function ListSection({ title, items = [], onAdd, onRemove, render }) { return <AdminSection title={title}><div className="investigation-admin__list-actions"><button type="button" onClick={onAdd}>Add</button></div>{!items.length ? <p className="description">Nothing here yet.</p> : items.map((item, index) => <article className="investigation-admin__row" key={item.id || index}><div className="investigation-admin__row-head"><strong>{title.replace(/s$/, '')} {index + 1}</strong><button type="button" className="is-danger" onClick={() => onRemove(index)}>Remove</button></div>{render(item, index)}</article>)}</AdminSection> }
function Field({ label, children }) { return <label className="investigation-admin__field"><span>{label}</span>{children}</label> }
function labelStatus(value) { return ({ developing: 'Developing', active: 'Active', published: 'Published / maintained', archived: 'Archived' })[value] || value }
function lines(value) { return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }
function itemId(prefix) { return `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)}` }
