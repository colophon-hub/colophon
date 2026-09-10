import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { normalizePodcastSettings, podcastShowOwnsEntry } from '../functions/api/_lib/podcastSettings.js'
import { parseRange } from '../functions/api/_lib/podcastHosting.js'
import { normalizeNativeEntry } from '../functions/api/_lib/nativePublicContent.js'
import { publicNativeItem } from '../functions/api/native-content.js'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('podcast settings retain native hosting and migration state', () => {
  const show = normalizePodcastSettings({ id: 'show', podcastTitle: 'Show', hostingMode: 'native', migrationState: 'complete', nativeSince: '2026-01-02T03:04:05Z', legacyFeedUrl: 'https://old.example/feed.xml' })
  assert.equal(show.hostingMode, 'native')
  assert.equal(show.migrationState, 'complete')
  assert.match(show.legacyFeedUrl, /^https:\/\/old\.example/)
})

test('show ownership accepts explicit native show identity', () => {
  assert.equal(podcastShowOwnsEntry({ id: 'show', sourceFeedUrls: [] }, { contentType: 'podcast', podcastShowId: 'show', sourceKind: 'podcast-native' }), true)
})

test('native content model preserves podcast delivery metadata for server use', () => {
  const item = normalizeNativeEntry({ contentType: 'podcast', podcastShowId: 'show', podcastStorageKey: 'media/podcasts/show/a.mp3', podcastMediaId: 'm1', podcastMimeType: 'audio/mpeg', podcastFileSize: 55 })
  assert.equal(item.podcastShowId, 'show')
  assert.equal(item.podcastStorageKey, 'media/podcasts/show/a.mp3')
  assert.equal(item.podcastFileSize, 55)
})

test('public projection strips native podcast storage identifiers', () => {
  const projected = publicNativeItem({ id: 'e1', podcastStorageKey: 'secret-key', podcastMediaId: 'private-media', podcastShowId: 'show', title: 'Episode' })
  assert.equal(projected.podcastStorageKey, undefined)
  assert.equal(projected.podcastMediaId, undefined)
  assert.equal(projected.podcastShowId, 'show')
})

test('podcast byte ranges support ordinary and suffix requests', () => {
  assert.deepEqual(parseRange('bytes=10-19', 100), { start: 10, end: 19 })
  assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 })
  assert.deepEqual(parseRange('bytes=200-220', 100), { invalid: true })
})

test('large podcast upload and migration stream bodies after probing headers', async () => {
  const source = await read('functions/api/_lib/podcastHosting.js')
  assert.match(source, /file\.slice\(0,/)
  assert.match(source, /bucket\.put\(key, file\.stream\(\)/)
  assert.match(source, /bucket\.put\(key, response\.body/)
})

test('native shows reject external RSS overwrite through the canonical importer', async () => {
  const source = await read('functions/api/podcast-import.js')
  assert.match(source, /show\?\.hostingMode === 'native'/)
  assert.match(source, /External RSS resync is disabled/)
})

test('scheduled source refresh reuses the canonical podcast importer', async () => {
  const source = await read('functions/api/podcast-source-refresh.js')
  assert.match(source, /import \{ runPodcastImport \} from '\.\/podcast-import\.js'/)
  assert.match(source, /PODCAST_REFRESH_TOKEN/)
})

test('distribution jobs isolate optional YouTube and PeerTube adapters', async () => {
  const source = await read('functions/api/_lib/podcastDistribution.js')
  assert.match(source, /PODCAST_DISTRIBUTION_YOUTUBE_URL/)
  assert.match(source, /PODCAST_DISTRIBUTION_PEERTUBE_URL/)
  assert.match(source, /state='failed'/)
  assert.match(source, /state='published'/)
})

test('canonical podcast RSS accepts measured native media URLs', async () => {
  const source = await read('functions/rss/podcast.xml.js')
  assert.match(source, /\/api\/podcast-media/)
  assert.match(source, /sourceExternalId/)
})
