import { getExistingNativeEntry, listNativeEntries, saveRevisionSnapshot, slugify, upsertNativeEntry } from './nativePublicContent.js'
import { findPodcastShow, podcastShowOwnsEntry, upsertPodcastShow } from './podcastSettings.js'
import { upsertMediaAsset } from './mediaAssets.js'
import { validateMediaBytes } from './mediaSignature.js'

export const PODCAST_AUDIO_TYPES = new Set(['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/flac','audio/webm'])
const MEDIA_BINDINGS = ['colophon_MEDIA_BUCKET','MEDIA_BUCKET','ASSETS_BUCKET','colophon_AUDIO_BUCKET','AUDIO_MEDIA_BUCKET']

export async function ensurePodcastHostingTables(db) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS podcast_hosting_jobs (
      id TEXT PRIMARY KEY, show_id TEXT NOT NULL, source_feed_url TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'queued',
      cursor INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, migrated INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0,
      errors_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_podcast_hosting_jobs_show ON podcast_hosting_jobs(show_id, updated_at DESC)`,
    `CREATE TABLE IF NOT EXISTS podcast_downloads_daily (
      episode_id TEXT NOT NULL, day TEXT NOT NULL, downloads INTEGER NOT NULL DEFAULT 0, bytes INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(episode_id, day)
    )`,
    `CREATE TABLE IF NOT EXISTS podcast_distribution_jobs (
      id TEXT PRIMARY KEY, episode_id TEXT NOT NULL, show_id TEXT NOT NULL, destination TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0, remote_id TEXT NOT NULL DEFAULT '', remote_url TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}', error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(episode_id, destination)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_podcast_distribution_state ON podcast_distribution_jobs(state, updated_at)`,
  ]
  for (const sql of statements) await db.prepare(sql).run()
}

export function findPodcastBucket(env = {}) {
  for (const name of MEDIA_BINDINGS) if (env?.[name]) return { name, bucket: env[name] }
  return null
}

export async function registerPodcastAudio(db, { showId, episodeId = '', file, requestUrl, env }) {
  const storage = findPodcastBucket(env)
  if (!storage) throw httpError('Media storage binding is required for native podcast hosting.', 503)
  const mimeType = normalizeAudioMime(file?.type || '')
  if (!PODCAST_AUDIO_TYPES.has(mimeType)) throw httpError(`unsupported podcast audio type: ${mimeType || 'unknown'}`, 415)
  const size = Number(file?.size || 0)
  if (!size) throw httpError('audio file is empty', 400)
  const header = await file.slice(0, Math.min(size, 256 * 1024)).arrayBuffer()
  const validation = validateMediaBytes(header, mimeType)
  if (!validation.ok) throw httpError(validation.reason, 415)
  const id = `podcast-audio-${crypto.randomUUID()}`
  const filename = sanitizeFilename(file.name || `${id}.${extensionForAudio(mimeType)}`)
  const key = `media/podcasts/${sanitizeSegment(showId)}/${episodeId ? `${sanitizeSegment(episodeId)}-` : ''}${id}-${filename}`
  await storage.bucket.put(key, file.stream(), { httpMetadata: { contentType: mimeType, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { showId, episodeId, filename, mediaId: id } })
  const url = new URL(requestUrl); url.pathname = '/api/podcast-media'; url.search = ''; url.searchParams.set('key', key); url.searchParams.set('filename', filename)
  const asset = await upsertMediaAsset(db, { id, title: filename.replace(/\.[^.]+$/, ''), url: url.toString(), downloadUrl: url.toString(), mimeType, size, mediaType: 'audio', filename, storageKey: key, folder: 'Podcasts', source: 'podcast-native' })
  return { ...asset, storageBinding: storage.name }
}

export async function publishNativeEpisode(db, { showId, input = {}, requestUrl }) {
  await ensurePodcastHostingTables(db)
  const show = await findPodcastShow(db, showId)
  if (!show) throw httpError('podcast show not found', 404)
  const existing = input.id ? await getExistingNativeEntry(db, input.id) : null
  const now = new Date().toISOString()
  const id = existing?.id || input.id || `podcast-${crypto.randomUUID()}`
  const guid = String(input.guid || existing?.sourceExternalId || `colophon:${show.id}:${id}`).trim()
  const publishedAt = validDate(input.publishedAt) || existing?.publishedAt || now
  const audio = normalizeAudioAsset(input.audio || {})
  if (!audio.storageKey && !existing?.podcastStorageKey) throw httpError('native episode audio is required', 400)
  const mediaUrl = measuredEpisodeUrl(requestUrl, id)
  const relatedAssets = mergeNativeDelivery(existing?.relatedAssets, {
    id: audio.id || existing?.podcastMediaId || `podcast-delivery-${id}`,
    role: 'delivery', source: 'podcast-native', type: 'audio', url: mediaUrl, publicUrl: mediaUrl,
    storageKey: audio.storageKey || existing?.podcastStorageKey || '', mimeType: audio.mimeType || existing?.podcastMimeType || 'audio/mpeg',
    size: Number(audio.size || existing?.podcastFileSize || 0), podcastGuid: guid,
    rssEnclosure: { url: mediaUrl, type: audio.mimeType || existing?.podcastMimeType || 'audio/mpeg', length: Number(audio.size || existing?.podcastFileSize || 0) },
  })
  const entry = await upsertNativeEntry(db, {
    ...(existing || {}), id, slug: existing?.slug || slugify(input.slug || input.title || id), contentType: 'podcast', status: input.status === 'draft' ? 'draft' : 'published',
    workflowState: input.status === 'draft' ? 'draft' : 'published', target: existing?.target || 'general', title: String(input.title || existing?.title || 'Untitled episode').trim(),
    excerpt: String(input.summary || input.excerpt || existing?.excerpt || '').trim(), body: String(input.summary || input.excerpt || existing?.body || '').trim(),
    bodyHtml: String(input.descriptionHtml || input.summary || existing?.bodyHtml || '').trim(), author: String(input.author || existing?.author || show.author || 'Colophon').trim(),
    sourceType: 'native', sourceKind: 'podcast-native', sourceLabel: show.podcastTitle, sourceUrl: show.rssFeedUrl, sourceExternalId: guid, sourcePostId: guid,
    sourceNotes: '', podcastShowId: show.id, podcastAudioUrl: mediaUrl, podcastRssEnclosureUrl: mediaUrl, audioSourceUrl: mediaUrl,
    podcastStorageKey: audio.storageKey || existing?.podcastStorageKey || '', podcastMediaId: audio.id || existing?.podcastMediaId || '',
    podcastMimeType: audio.mimeType || existing?.podcastMimeType || 'audio/mpeg', podcastFileSize: Number(audio.size || existing?.podcastFileSize || 0),
    podcastDuration: String(input.duration || existing?.podcastDuration || ''), podcastEpisodeNumber: String(input.episodeNumber || existing?.podcastEpisodeNumber || ''),
    podcastSeason: String(input.season || existing?.podcastSeason || ''), podcastSummary: String(input.summary || existing?.podcastSummary || ''),
    podcastCoverImage: String(input.coverImage || existing?.podcastCoverImage || show.defaultCoverArt || ''), featuredImage: String(input.coverImage || existing?.featuredImage || show.defaultCoverArt || ''),
    relatedAssets, categories: unique(['podcast', show.slug, ...(input.categories || existing?.categories || [])]), tags: unique([show.slug, ...(input.tags || existing?.tags || [])]),
    createdAt: existing?.createdAt || publishedAt, publishedAt,
  })
  await saveRevisionSnapshot(db, entry, existing ? 'podcast-native-update' : 'podcast-native-publish')
  await upsertPodcastShow(db, { ...show, hostingMode: 'native', nativeSince: show.nativeSince || now, migrationState: show.migrationState === 'running' ? 'running' : 'complete' }, { showId: show.id })
  return entry
}

export async function recordPodcastDelivery(db, episodeId, bytes, countDownload = true) {
  await ensurePodcastHostingTables(db)
  const day = new Date().toISOString().slice(0, 10)
  await db.prepare(`INSERT INTO podcast_downloads_daily(episode_id,day,downloads,bytes) VALUES(?,?,?,?)
    ON CONFLICT(episode_id,day) DO UPDATE SET downloads=downloads+excluded.downloads, bytes=bytes+excluded.bytes`)
    .bind(episodeId, day, countDownload ? 1 : 0, Math.max(0, Number(bytes || 0))).run()
}

export async function podcastDownloadSummary(db, showId = '') {
  await ensurePodcastHostingTables(db)
  const entries = (await listNativeEntries(db, { includeFuture: true })).filter((entry) => entry.contentType === 'podcast' && (!showId || entry.podcastShowId === showId))
  const ids = new Set(entries.map((entry) => entry.id))
  const rows = await db.prepare('SELECT episode_id, day, downloads, bytes FROM podcast_downloads_daily ORDER BY day DESC').all()
  const items = (rows.results || []).filter((row) => ids.has(row.episode_id))
  return { items, totals: items.reduce((sum, row) => ({ downloads: sum.downloads + Number(row.downloads || 0), bytes: sum.bytes + Number(row.bytes || 0) }), { downloads: 0, bytes: 0 }) }
}

export function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(value || '').trim())
  if (!match || !size) return null
  let start = match[1] ? Number(match[1]) : NaN, end = match[2] ? Number(match[2]) : NaN
  if (!Number.isFinite(start) && Number.isFinite(end)) { start = Math.max(0, size - end); end = size - 1 }
  else { if (!Number.isFinite(start)) return null; if (!Number.isFinite(end) || end >= size) end = size - 1 }
  if (start < 0 || end < start || start >= size) return { invalid: true }
  return { start, end }
}

export async function findNativePodcastEpisode(db, episodeId) {
  const entry = await getExistingNativeEntry(db, episodeId)
  return entry?.contentType === 'podcast' && entry?.sourceKind === 'podcast-native' ? entry : null
}

export function measuredEpisodeUrl(requestUrl, episodeId) { const url = new URL(requestUrl); url.pathname = '/api/podcast-media'; url.search = ''; url.searchParams.set('episode', episodeId); return url.toString() }
export function sanitizeFilename(value) { return (String(value || 'audio').split(/[\\/]/).pop().trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'audio').slice(0, 180) }
export function sanitizeSegment(value) { return String(value || 'podcast').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'podcast' }
export function normalizeAudioMime(value) { const mime=String(value||'').split(';')[0].toLowerCase(); return mime==='audio/x-m4a'?'audio/mp4':mime==='audio/x-wav'?'audio/wav':mime }
function extensionForAudio(mime) { return mime === 'audio/mp4' ? 'm4a' : mime === 'audio/ogg' ? 'ogg' : mime === 'audio/flac' ? 'flac' : mime === 'audio/wav' ? 'wav' : mime === 'audio/webm' ? 'webm' : 'mp3' }
function normalizeAudioAsset(value={}) { return { id:String(value.id||''), storageKey:String(value.storageKey||''), mimeType:normalizeAudioMime(value.mimeType||'audio/mpeg'), size:Number(value.size||0), filename:String(value.filename||'') } }
function mergeNativeDelivery(existing, delivery) { return [...(Array.isArray(existing)?existing.filter((item)=>!(item?.role==='delivery' && item?.source==='podcast-native')):[]), delivery] }
function unique(values=[]) { return [...new Set(values.map((value)=>String(value||'').trim()).filter(Boolean))] }
function validDate(value) { const raw=String(value||'').trim(); const date=new Date(raw); return raw && Number.isFinite(date.getTime()) ? date.toISOString() : '' }
function httpError(message,status=400){const error=new Error(message);error.status=status;return error}

export async function migrateRemotePodcastAudio(db, { showId, episodeId, enclosureUrl, mimeType, size = 0, requestUrl, env }) {
  const storage = findPodcastBucket(env)
  if (!storage) throw httpError('Media storage binding is required for podcast migration.', 503)
  const url = assertPublicHttpUrl(enclosureUrl)
  const declared = normalizeAudioMime(mimeType || 'audio/mpeg')
  if (!PODCAST_AUDIO_TYPES.has(declared)) throw httpError(`unsupported podcast audio type: ${declared}`, 415)
  const probe = await fetch(url, { headers: { range: 'bytes=0-262143', accept: 'audio/*,*/*;q=0.5' }, redirect: 'follow' })
  if (!probe.ok && probe.status !== 206) throw httpError(`podcast audio probe returned ${probe.status}`, 502)
  const probeBytes = await readPrefix(probe.body, 256 * 1024)
  const validation = validateMediaBytes(probeBytes, declared)
  if (!validation.ok) throw httpError(validation.reason, 415)
  const response = await fetch(url, { headers: { accept: 'audio/*,*/*;q=0.5' }, redirect: 'follow' })
  if (!response.ok || !response.body) throw httpError(`podcast audio download returned ${response.status}`, 502)
  const responseType = normalizeAudioMime(response.headers.get('content-type') || declared)
  const finalType = PODCAST_AUDIO_TYPES.has(responseType) ? responseType : declared
  const contentLength = Number(response.headers.get('content-length') || size || 0)
  const id = `podcast-audio-${crypto.randomUUID()}`
  const filename = sanitizeFilename(new URL(response.url || url).pathname.split('/').pop() || `${episodeId}.${extensionForAudio(finalType)}`)
  const key = `media/podcasts/${sanitizeSegment(showId)}/${sanitizeSegment(episodeId)}-${id}-${filename}`
  await storage.bucket.put(key, response.body, { httpMetadata: { contentType: finalType, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { showId, episodeId, filename, mediaId: id, migratedFrom: url } })
  const mediaUrl = new URL(requestUrl); mediaUrl.pathname = '/api/podcast-media'; mediaUrl.search = ''; mediaUrl.searchParams.set('key', key); mediaUrl.searchParams.set('filename', filename)
  const asset = await upsertMediaAsset(db, { id, title: filename.replace(/\.[^.]+$/, ''), url: mediaUrl.toString(), downloadUrl: mediaUrl.toString(), mimeType: finalType, size: contentLength, mediaType: 'audio', filename, storageKey: key, folder: 'Podcasts', source: 'podcast-migration', sourceUrl: url })
  return asset
}

function assertPublicHttpUrl(value) {
  let url
  try { url = new URL(String(value || '').trim()) } catch { throw httpError('invalid podcast media URL', 400) }
  if (!['http:', 'https:'].includes(url.protocol)) throw httpError('podcast media URL must use HTTP or HTTPS', 400)
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0' || host === '::1' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw httpError('podcast media URL resolves to a private/local host', 400)
  return url.toString()
}

export async function migrateRemotePodcastArtwork(db, { showId, imageUrl, requestUrl, env }) {
  const storage = findPodcastBucket(env)
  if (!storage) throw httpError('Media storage binding is required for podcast artwork migration.', 503)
  const url = assertPublicHttpUrl(imageUrl)
  const response = await fetch(url, { headers: { accept: 'image/jpeg,image/png,image/webp,image/gif,*/*;q=0.2' }, redirect: 'follow' })
  if (!response.ok || !response.body) throw httpError(`podcast artwork download returned ${response.status}`, 502)
  const mimeType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase()
  if (!new Set(['image/jpeg','image/png','image/webp','image/gif']).has(mimeType)) throw httpError(`unsupported podcast artwork type: ${mimeType || 'unknown'}`, 415)
  const announcedSize = Number(response.headers.get('content-length') || 0)
  if (announcedSize > 25 * 1024 * 1024) throw httpError('podcast artwork is too large', 413)
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > 25 * 1024 * 1024) throw httpError('podcast artwork is too large', 413)
  const validation = validateMediaBytes(bytes.slice(0, Math.min(bytes.byteLength, 256 * 1024)), mimeType)
  if (!validation.ok) throw httpError(validation.reason, 415)
  const id = `podcast-artwork-${crypto.randomUUID()}`
  const filename = sanitizeFilename(new URL(response.url || url).pathname.split('/').pop() || `${showId}.${mimeType.split('/')[1]}`)
  const key = `media/podcasts/${sanitizeSegment(showId)}/artwork-${id}-${filename}`
  await storage.bucket.put(key, bytes, { httpMetadata: { contentType: mimeType, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { showId, filename, mediaId: id, migratedFrom: url } })
  const mediaUrl = new URL(requestUrl); mediaUrl.pathname = '/api/media/files'; mediaUrl.search=''; mediaUrl.searchParams.set('key', key); mediaUrl.searchParams.set('filename', filename)
  return upsertMediaAsset(db, { id, title: `${showId} podcast artwork`, url: mediaUrl.toString(), downloadUrl: mediaUrl.toString(), mimeType, size: bytes.byteLength, mediaType: 'image', filename, storageKey: key, folder: 'Podcasts', source: 'podcast-migration', sourceUrl: url })
}


async function readPrefix(stream, limit) {
  if (!stream?.getReader) return new ArrayBuffer(0)
  const reader = stream.getReader(), chunks = []
  let total = 0
  try {
    while (total < limit) {
      const { value, done } = await reader.read()
      if (done) break
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || 0)
      const take = bytes.slice(0, Math.max(0, limit - total))
      chunks.push(take); total += take.byteLength
      if (total >= limit) break
    }
  } finally { try { await reader.cancel() } catch {} }
  const merged = new Uint8Array(total); let offset = 0
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength }
  return merged.buffer
}
