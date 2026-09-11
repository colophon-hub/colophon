import { useEffect, useState } from 'react'
import { isLocalRuntime } from '../lib/runtime'

export function WebmentionsPanel({ slug }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!slug || isLocalRuntime()) return undefined
    let cancelled = false

    async function load() {
      try {
        const target = `${window.location.origin}/post/${encodeURIComponent(slug)}`
        const response = await fetch(`/api/webmention?target=${encodeURIComponent(target)}`, {
          headers: { accept: 'application/json' },
        })
        const data = await response.json().catch(() => ({}))
        if (!cancelled && response.ok && data?.ok && Array.isArray(data.items)) setItems(data.items)
      } catch {
        // Public mentions are supplemental; article rendering must not fail with the endpoint.
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug])

  if (!items.length) return null

  return (
    <section className="piece-webmentions" aria-labelledby="piece-webmentions-title">
      <h2 id="piece-webmentions-title">Mentions</h2>
      <div className="colophon-webmention-list">
        {items.map((item) => (
          <article className="colophon-webmention-card" key={item.id}>
            <div>
              <strong>{item.authorName || item.sourceTitle || 'Mention'}</strong>
              {item.contentText ? <p>{item.contentText}</p> : null}
              <a href={item.source} rel="nofollow noopener noreferrer">View source</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
