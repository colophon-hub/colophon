import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'
import { adminRoutes } from '../routing/routes'

function hasCapability(capabilities, capability) {
  return Array.isArray(capabilities) && (capabilities.includes('*') || capabilities.includes(capability))
}

function formatState(value) {
  return String(value || 'draft').replaceAll('_', ' ')
}

export function NewsroomPanel() {
  const { capabilities, role } = useAdminAuth()
  const canWrite = hasCapability(capabilities, 'content:write')
  const canReview = hasCapability(capabilities, 'review:manage')
  const canPublish = hasCapability(capabilities, 'publishing:write')
  const canComment = hasCapability(capabilities, 'review:comment')
  const [items, setItems] = useState([])
  const [notes, setNotes] = useState({})
  const [dates, setDates] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!canWrite) return
    try {
      setError('')
      const res = await fetch('/api/editorial-review', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Newsroom load failed: ${res.status}`)
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setError(String(err?.message || err))
    }
  }, [canWrite])

  useEffect(() => { load() }, [load])

  const reviewQueue = useMemo(() => items.filter((item) => ['in_review', 'ready'].includes(item.workflowState)), [items])
  const ownWork = useMemo(() => items.filter((item) => !['published', 'scheduled', 'archived', 'trash'].includes(item.workflowState)), [items])
  const visible = canReview ? reviewQueue : ownWork

  async function review(item, action, options = {}) {
    try {
      setBusy(`${item.id}:${action}`)
      setError('')
      setNotice('')
      const res = await fetch('/api/editorial-review', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ nativeId: item.id, action, comment: notes[item.id] || '', scheduledFor: options.scheduledFor || '' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Review action failed: ${res.status}`)
      setNotes((current) => ({ ...current, [item.id]: '' }))
      setNotice(`${item.title || 'Untitled'} is now ${formatState(data.item?.workflowState)}.`)
      await load()
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setBusy('')
    }
  }

  async function comment(item) {
    const text = String(notes[item.id] || '').trim()
    if (!text) return
    try {
      setBusy(`${item.id}:comment`)
      setError('')
      const res = await fetch('/api/editorial-comments', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ nativeId: item.id, body: text }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Comment failed: ${res.status}`)
      setNotes((current) => ({ ...current, [item.id]: '' }))
      await load()
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setBusy('')
    }
  }

  if (!canWrite) return null

  return (
    <section className="admin-workflow-card newsroom-panel" aria-labelledby="newsroom-heading">
      <div className="admin-workflow-card__eyebrow">newsroom</div>
      <h2 id="newsroom-heading">{canReview ? 'Review queue' : 'My submissions'}</h2>
      <p className="admin-workflow-card__description">
        {canReview ? 'Review submitted work, request revisions, approve it for publication, decline it, or publish ready pieces.' : 'Draft, submit, revise, and follow your work through editorial review. Publishing decisions stay with editors.'}
      </p>
      <p><Link className="button button--primary" to={adminRoutes.nativeBridge}>{canReview ? 'Open content editor' : 'Write or edit a piece'}</Link></p>
      {error ? <div className="notice notice-error" role="alert"><p>{error}</p></div> : null}
      {notice ? <div className="notice notice-success" role="status"><p>{notice}</p></div> : null}
      {!visible.length ? <p className="description">{canReview ? 'Nothing is waiting for review.' : 'You do not have any active submissions yet.'}</p> : null}
      {visible.map((item) => {
        const comments = Array.isArray(item.editorialComments) ? item.editorialComments : []
        const isBusy = busy.startsWith(`${item.id}:`)
        return (
          <article key={item.id} className="wp-meta-box newsroom-item">
            <div className="wp-screen-header"><div><h3>{item.title || 'Untitled'}</h3><p className="description">{formatState(item.workflowState)} · updated {new Date(item.updatedAt).toLocaleString()}</p></div></div>
            {comments.length ? <div className="newsroom-comments" aria-label="Editorial comments">{comments.slice(-3).map((comment) => <p key={comment.id}><strong>{comment.authorName || comment.authorRole || 'editor'}:</strong> {comment.body}</p>)}</div> : null}
            {canComment ? <label><span className="screen-reader-text">Editorial comment</span><textarea rows="2" value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={canReview ? 'Editorial note or reason for changes…' : 'Reply to the editor…'} /></label> : null}
            <div className="wp-row-actions">
              {!canReview && ['draft', 'needs_revision'].includes(item.workflowState) ? <button className="button button--primary" type="button" disabled={isBusy} onClick={() => review(item, item.workflowState === 'needs_revision' ? 'resubmit' : 'submit')}>{item.workflowState === 'needs_revision' ? 'Resubmit' : 'Submit for review'}</button> : null}
              {!canReview && canComment && notes[item.id]?.trim() ? <button className="button" type="button" disabled={isBusy} onClick={() => comment(item)}>Add comment</button> : null}
              {canReview && item.workflowState === 'in_review' ? <>
                <button className="button" type="button" disabled={isBusy} onClick={() => review(item, 'request_changes')}>Request changes</button>
                <button className="button button--primary" type="button" disabled={isBusy} onClick={() => review(item, 'approve')}>Mark ready</button>
                <button className="button button-link-delete" type="button" disabled={isBusy} onClick={() => review(item, 'decline')}>Decline</button>
              </> : null}
              {canReview && canComment && notes[item.id]?.trim() ? <button className="button" type="button" disabled={isBusy} onClick={() => comment(item)}>Add comment</button> : null}
              {canReview && canPublish && item.workflowState === 'ready' ? <>
                <button className="button button--primary" type="button" disabled={isBusy} onClick={() => review(item, 'publish')}>Publish</button>
                <input type="datetime-local" aria-label={`Schedule ${item.title || 'piece'}`} value={dates[item.id] || ''} onChange={(event) => setDates((current) => ({ ...current, [item.id]: event.target.value }))} />
                <button className="button" type="button" disabled={isBusy || !dates[item.id]} onClick={() => review(item, 'schedule', { scheduledFor: dates[item.id] })}>Schedule</button>
              </> : null}
            </div>
          </article>
        )
      })}
      <p className="description">Signed in as {role || 'user'}. Content ownership is account-based and separate from the public byline.</p>
    </section>
  )
}
