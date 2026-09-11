import { assertSafeRemoteUrl, ensureWebmentionTables, safeFetchHtml } from './webmentions.js'

export async function sendWebmentionsForEntry(context, db, entry) {
  if (!db || entry?.status !== 'published' || !entry?.slug) return []

  await ensureWebmentionTables(db)
  const origin = new URL(context.request.url).origin
  const source = `${origin}/post/${encodeURIComponent(entry.slug)}`
  const links = extractOutboundLinks(entry.bodyHtml || entry.body || '', source)
  const results = []

  for (const target of links.slice(0, 50)) {
    try {
      const endpoint = await discoverWebmentionEndpoint(target)
      if (!endpoint) {
        await recordOutbound(db, {
          source,
          target,
          endpoint: '',
          status: 'unsupported',
          httpStatus: 0,
          error: 'No Webmention endpoint discovered',
        })
        results.push({ target, status: 'unsupported' })
        continue
      }

      const form = new URLSearchParams({ source, target })
      const response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          accept: 'application/json,text/plain,*/*',
          'user-agent': 'Colophon-Webmention/1.0',
        },
        body: form.toString(),
      })
      const status = response.ok || response.status === 202 ? 'sent' : 'failed'

      await recordOutbound(db, {
        source,
        target,
        endpoint,
        status,
        httpStatus: response.status,
        error: status === 'failed' ? `HTTP ${response.status}` : '',
      })
      results.push({ target, endpoint, status, httpStatus: response.status })
    } catch (error) {
      await recordOutbound(db, {
        source,
        target,
        endpoint: '',
        status: 'failed',
        httpStatus: 0,
        error: String(error?.message || error).slice(0, 500),
      })
      results.push({ target, status: 'failed', error: String(error?.message || error) })
    }
  }

  return results
}

export function extractOutboundLinks(html, sourceUrl) {
  const source = new URL(sourceUrl)
  const seen = new Set()
  const out = []
  const regex = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi
  let match

  while ((match = regex.exec(String(html || '')))) {
    const raw = (match[1] || match[2] || match[3] || '').replace(/&amp;/gi, '&')
    try {
      const url = new URL(raw, source)
      url.hash = ''
      if (!['http:', 'https:'].includes(url.protocol) || url.origin === source.origin) continue
      const normalized = url.toString()
      if (seen.has(normalized)) continue
      assertSafeRemoteUrl(normalized)
      seen.add(normalized)
      out.push(normalized)
    } catch {
      // Ignore malformed/unsafe links. They remain ordinary article links.
    }
  }

  return out
}

export async function discoverWebmentionEndpoint(targetUrl) {
  const fetched = await safeFetchHtml(assertSafeRemoteUrl(targetUrl))
  const linkHeader = fetched.headers?.get?.('link') || ''
  const linkParts = String(linkHeader).split(/,(?=\s*<)/).map((item) => item.trim()).filter(Boolean)

  for (const part of linkParts) {
    if (!/\brel\s*=\s*"?[^"]*\bwebmention\b/i.test(part)) continue
    const match = part.match(/<([^>]+)>/)
    if (match) return assertSafeRemoteUrl(new URL(match[1], fetched.url).toString()).toString()
  }

  const tag = String(fetched.html || '').match(/<(?:link|a)\b[^>]*\brel\s*=\s*["'][^"']*\bwebmention\b[^"']*["'][^>]*>/i)
  if (!tag) return ''

  const href = tag[0].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
  const raw = href?.[1] || href?.[2] || href?.[3] || ''
  if (!raw) return ''
  return assertSafeRemoteUrl(new URL(raw, fetched.url).toString()).toString()
}

export async function listOutboundWebmentions(db, { status = '', limit = 100 } = {}) {
  await ensureWebmentionTables(db)
  const bounded = Math.min(200, Math.max(1, Number(limit) || 100))
  const result = status
    ? await db.prepare(`SELECT * FROM webmention_outbound WHERE status = ? ORDER BY datetime(updated_at) DESC LIMIT ${bounded}`).bind(String(status)).all()
    : await db.prepare(`SELECT * FROM webmention_outbound ORDER BY datetime(updated_at) DESC LIMIT ${bounded}`).all()

  return (result?.results || []).map((row) => ({
    id: String(row.id || ''),
    source: String(row.source || ''),
    target: String(row.target || ''),
    endpoint: String(row.endpoint || ''),
    status: String(row.status || ''),
    httpStatus: Number(row.http_status || 0),
    error: String(row.error || ''),
    attemptedAt: String(row.attempted_at || ''),
    updatedAt: String(row.updated_at || ''),
  }))
}

async function recordOutbound(db, item) {
  const id = `wmo-${await sha256Hex(`${item.source}\n${item.target}`)}`
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO webmention_outbound (
      id, source, target, endpoint, status, http_status, error, attempted_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, target) DO UPDATE SET
      endpoint = excluded.endpoint,
      status = excluded.status,
      http_status = excluded.http_status,
      error = excluded.error,
      attempted_at = excluded.attempted_at,
      updated_at = excluded.updated_at`)
    .bind(
      id,
      item.source,
      item.target,
      item.endpoint || '',
      item.status || 'failed',
      Number(item.httpStatus || 0),
      item.error || '',
      now,
      now,
    ).run()
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value))))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
