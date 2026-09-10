import { getBoundDb } from './_lib/database.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import {
  findNativePodcastEpisode,
  findPodcastBucket,
  parseRange,
  recordPodcastDelivery,
  registerPodcastAudio,
  sanitizeFilename,
} from './_lib/podcastHosting.js'

export async function onRequestPost(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permissionHasCapability(permission, 'publishing:write') && !permission.canEdit) return json({ ok: false, error: 'publishing permission required' }, 403)
  const db = getBoundDb(context)
  if (!db) return json({ ok: false, error: 'BF_DB binding is required' }, 503)
  try {
    const form = await context.request.formData()
    const file = form.get('file') || form.get('media')
    if (!file || typeof file.stream !== 'function') return json({ ok: false, error: 'audio file is required' }, 400)
    const showId = String(form.get('showId') || '').trim()
    if (!showId) return json({ ok: false, error: 'showId is required' }, 400)
    const episodeId = String(form.get('episodeId') || '').trim()
    const asset = await registerPodcastAudio(db, { showId, episodeId, file, requestUrl: context.request.url, env: context.env })
    return json({ ok: true, asset })
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 500)
  }
}

export async function onRequestGet(context) {
  const db = getBoundDb(context)
  if (!db) return text('podcast media unavailable', 503)
  const storage = findPodcastBucket(context.env)
  if (!storage) return text('podcast media storage unavailable', 503)
  try {
    const url = new URL(context.request.url)
    const episodeId = String(url.searchParams.get('episode') || '').trim()
    let key = String(url.searchParams.get('key') || '').trim()
    let filename = sanitizeFilename(url.searchParams.get('filename') || 'podcast-audio')
    let contentType = ''
    if (episodeId) {
      const episode = await findNativePodcastEpisode(db, episodeId)
      if (!episode || episode.status !== 'published') return text('podcast episode not found', 404)
      key = String(episode.podcastStorageKey || '').trim()
      contentType = String(episode.podcastMimeType || '').trim()
      const asset = (episode.relatedAssets || []).find((item) => item?.source === 'podcast-native' && item?.role === 'delivery')
      filename = sanitizeFilename(asset?.filename || filename)
    }
    if (!key || key.includes('..') || !key.startsWith('media/podcasts/')) return text('missing or invalid podcast media key', 400)
    const head = await storage.bucket.head(key)
    if (!head) return text('podcast media not found', 404)
    const size = Number(head.size || 0)
    contentType ||= head.httpMetadata?.contentType || head.customMetadata?.contentType || 'audio/mpeg'
    const range = parseRange(context.request.headers.get('range'), size)
    if (range?.invalid) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}`, 'accept-ranges': 'bytes' } })
    const object = range
      ? await storage.bucket.get(key, { range: { offset: range.start, length: range.end - range.start + 1 } })
      : await storage.bucket.get(key)
    if (!object?.body) return text('podcast media not found', 404)
    const deliveredBytes = range ? range.end - range.start + 1 : size
    if (episodeId && context.request.method !== 'HEAD') {
      const countDownload = !range || range.start === 0
      context.waitUntil?.(recordPodcastDelivery(db, episodeId, deliveredBytes, countDownload))
    }
    const headers = new Headers({
      'content-type': contentType,
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'content-disposition': `inline; filename="${filename}"`,
    })
    if (range) {
      headers.set('content-range', `bytes ${range.start}-${range.end}/${size}`)
      headers.set('content-length', String(deliveredBytes))
      return new Response(object.body, { status: 206, headers })
    }
    if (size) headers.set('content-length', String(size))
    return new Response(object.body, { status: 200, headers })
  } catch (error) {
    return text(String(error?.message || error), 500)
  }
}

export async function onRequestHead(context) { return onRequestGet(context) }
function json(value,status=200){return new Response(JSON.stringify(value,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function text(value,status=200){return new Response(value,{status,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
