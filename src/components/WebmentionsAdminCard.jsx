import { useEffect, useState } from 'react'
import { isLocalRuntime } from '../lib/runtime'

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Webmention request failed (${response.status})`)
  return data
}

export function WebmentionsAdminCard() {
  const local = isLocalRuntime()
  const [direction, setDirection] = useState('inbound')
  const [state, setState] = useState('pending')
  const [items, setItems] = useState([])
  const [message, setMessage] = useState('')

  async function load(nextDirection = direction, nextState = state) {
    if (local) return
    try {
      const path = nextDirection === 'outbound'
        ? '/api/webmentions?direction=outbound'
        : `/api/webmentions?state=${encodeURIComponent(nextState)}`
      const data = await api(path)
      setItems(data.items || [])
      setMessage('')
    } catch (error) {
      setMessage(String(error?.message || error))
    }
  }

  useEffect(() => { load(direction, state) }, [direction, state, local])

  async function moderate(id, action) {
    try {
      await api('/api/webmentions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      await load('inbound', state)
    } catch (error) {
      setMessage(String(error?.message || error))
    }
  }

  if (local) {
    return (
      <section className="wp-meta-box">
        <h2>Webmentions</h2>
        <p className="description">Receiving and sending Webmentions requires a shared/server edition with a public address.</p>
      </section>
    )
  }

  return (
    <section className="wp-meta-box" aria-labelledby="webmentions-admin-title">
      <h2 id="webmentions-admin-title">Webmentions</h2>
      <p className="description">Incoming remote content is verified and held for moderation. Outgoing delivery attempts are logged without blocking publication.</p>

      <div className="review-card__actions" role="tablist" aria-label="Webmention direction">
        <button className={`button${direction === 'inbound' ? ' button--primary' : ''}`} type="button" onClick={() => setDirection('inbound')}>Incoming</button>
        <button className={`button${direction === 'outbound' ? ' button--primary' : ''}`} type="button" onClick={() => setDirection('outbound')}>Outgoing</button>
      </div>

      {direction === 'inbound' ? (
        <>
          <div className="review-card__actions" role="tablist" aria-label="Webmention moderation states">
            {['pending', 'approved', 'rejected', 'spam'].map((value) => (
              <button
                className={`button${state === value ? ' button--primary' : ''}`}
                type="button"
                key={value}
                onClick={() => setState(value)}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="colophon-webmention-list">
            {items.map((item) => (
              <article className="colophon-webmention-card" key={item.id}>
                <div>
                  <strong>{item.authorName || item.sourceTitle || item.source}</strong>
                  <p>{item.contentText || 'No excerpt supplied by source.'}</p>
                  <a href={item.source} rel="noopener noreferrer" target="_blank">Source</a>
                </div>
                <div className="review-card__actions">
                  {state !== 'approved' ? <button className="button" type="button" onClick={() => moderate(item.id, 'approve')}>Approve</button> : null}
                  {state !== 'rejected' ? <button className="button" type="button" onClick={() => moderate(item.id, 'reject')}>Reject</button> : null}
                  {state !== 'spam' ? <button className="button" type="button" onClick={() => moderate(item.id, 'spam')}>Spam</button> : null}
                  <button className="button" type="button" onClick={() => moderate(item.id, 'reverify')}>Reverify</button>
                  <button className="button button-link-delete" type="button" onClick={() => moderate(item.id, 'delete')}>Delete</button>
                </div>
              </article>
            ))}
            {!items.length ? <p className="description">No {state} Webmentions.</p> : null}
          </div>
        </>
      ) : (
        <div className="colophon-webmention-list">
          {items.map((item) => (
            <article className="colophon-webmention-card" key={item.id}>
              <div>
                <strong>{item.status || 'unknown'}</strong>
                <p><a href={item.target} rel="noopener noreferrer" target="_blank">{item.target}</a></p>
                <p className="description">
                  {item.endpoint ? `Endpoint: ${item.endpoint}` : 'No endpoint discovered'}
                  {item.httpStatus ? ` · HTTP ${item.httpStatus}` : ''}
                  {item.attemptedAt ? ` · ${item.attemptedAt}` : ''}
                </p>
                {item.error ? <p className="notice notice-error">{item.error}</p> : null}
              </div>
            </article>
          ))}
          {!items.length ? <p className="description">No outgoing Webmention attempts have been recorded.</p> : null}
        </div>
      )}

      {message ? <p className="notice notice-error" role="alert">{message}</p> : null}
    </section>
  )
}
