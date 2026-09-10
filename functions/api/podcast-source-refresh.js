import { runPodcastImport } from './podcast-import.js'
import { readPodcastShows } from './_lib/podcastSettings.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'

const BATCH_LIMIT = 250

export async function onRequestPost(context) {
  const permission = await resolvePublicSitePermission(context)
  const configuredToken = String(context.env?.PODCAST_REFRESH_TOKEN || '').trim()
  const suppliedToken = bearer(context.request) || String(context.request.headers.get('x-podcast-refresh-token') || '').trim()
  const scheduled = Boolean(configuredToken && suppliedToken && timingSafeTextEqual(configuredToken, suppliedToken))
  if (!scheduled && !permissionHasCapability(permission, 'publishing:write')) {
    return json({ ok: false, error: 'publishing permission or PODCAST_REFRESH_TOKEN required' }, 403)
  }
  const db = context.env?.BF_DB
  if (!db) return json({ ok: false, error: 'podcast refresh unavailable: BF_DB is not bound' }, 503)

  const body = await context.request.json().catch(() => ({}))
  const requestedShowId = String(body.showId || '').trim()
  const registry = await readPodcastShows(db)
  const shows = registry.shows.filter((show) => (!requestedShowId || show.id === requestedShowId) && show.hostingMode !== 'native' && show.sourceFeedUrl)
  const results = []
  for (const show of shows) {
    try {
      const preview = await runPodcastImport(db, { action: 'preview', feedUrl: show.sourceFeedUrl, showId: show.id }, { actor: scheduled ? 'scheduled-refresh' : 'editor-refresh', canonicalBaseUrl: new URL(context.request.url).origin })
      const selectedKeys = (preview.episodes || []).slice(0, BATCH_LIMIT).map((episode) => episode.key)
      const synced = selectedKeys.length
        ? await runPodcastImport(db, { action: 'sync', feedUrl: show.sourceFeedUrl, showId: show.id, selectedKeys, syncExisting: true, importChannelSettings: body.importChannelSettings !== false }, { actor: scheduled ? 'scheduled-refresh' : 'editor-refresh', canonicalBaseUrl: new URL(context.request.url).origin })
        : { result: { created: 0, updated: 0, skipped: 0 } }
      results.push({ showId: show.id, ok: true, selected: selectedKeys.length, total: preview.episodes?.length || 0, result: synced.result })
    } catch (error) {
      results.push({ showId: show.id, ok: false, error: String(error?.message || error) })
    }
  }
  return json({ ok: true, checked: shows.length, results })
}

function bearer(request) { const raw = String(request.headers.get('authorization') || ''); return /^Bearer\s+/i.test(raw) ? raw.replace(/^Bearer\s+/i, '').trim() : '' }
function timingSafeTextEqual(a, b) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0 }
function json(value, status = 200) { return new Response(JSON.stringify(value, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }) }
