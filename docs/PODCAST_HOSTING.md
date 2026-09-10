# Native podcast hosting

Colophon can import external podcast RSS without hosting media, or become the first-party host for a show. Native hosting extends the existing RSS importer rather than replacing it.

## Native hosting and migration

The podcast settings screen exposes native hosting for server installations with database and media-storage bindings. A migration job records its cursor and totals in D1 so large archives can move in repeatable 25-episode batches. Existing episode GUIDs and original publication dates are preserved. Show artwork is copied into first-party storage when possible. Audio is streamed into object storage rather than buffered as a complete file in application memory.

When migration completes, the show is marked `native`. The canonical RSS importer refuses subsequent external sync/resync writes for a native show, preventing an old feed from overwriting first-party episodes. The original feed remains recorded as the legacy source.

Manual native episode publishing accepts an audio file and episode metadata. A blank GUID receives a stable Colophon GUID; supplied or migrated GUIDs are retained.

## Media delivery and analytics

Native episode enclosures use `/api/podcast-media?episode=...`. Delivery supports HTTP byte ranges and returns `Accept-Ranges`, `Content-Range`, correct media types and `X-Content-Type-Options: nosniff`.

Analytics intentionally store only aggregate daily values per episode:

- download starts, counted for full requests or ranges beginning at byte zero
- bytes delivered

No listener IP, user-agent fingerprint, account, cookie identifier or per-listener history is stored by this subsystem.

## Storage and public domain

Native podcast media uses the same configurable media binding family as the Media Library. The preferred binding is `colophon_MEDIA_BUCKET`; compatible existing media bindings are also recognized.

`canonicalBaseUrl` can be set per show when the public podcast domain differs from the admin origin. If omitted while saving on a server, the current server origin is used.

For subscriber transfer, save the canonical transfer target with the show and configure the old provider to issue its supported permanent feed redirect, normally HTTP 301 or its podcast-specific new-feed mechanism. Colophon cannot force a redirect from a third-party host it does not control.

## Distribution jobs

Publishing always treats the Colophon website and canonical RSS as independent local destinations. Optional `youtube` and `peertube` destinations are queued separately. Each job records destination, state, attempts, remote ID, remote URL, metadata and error text. One failed destination does not roll back the canonical episode or another destination.

External adapters are opt-in HTTP workers:

- `PODCAST_DISTRIBUTION_YOUTUBE_URL`
- `PODCAST_DISTRIBUTION_YOUTUBE_TOKEN`
- `PODCAST_DISTRIBUTION_PEERTUBE_URL`
- `PODCAST_DISTRIBUTION_PEERTUBE_TOKEN`

The adapter receives the episode/show metadata and returns JSON containing optional `remoteId` and `remoteUrl`. This keeps provider credentials outside Colophon's core and allows an installation to use its preferred YouTube or PeerTube uploader.

`EPISODE_WORKER_TOKEN` allows a trusted scheduled worker to process queued jobs without an editor browser session. Editors can also process/retry jobs through authenticated admin actions.

## Scheduled external-source refresh

`/api/podcast-source-refresh` reuses the exact canonical RSS import function used by manual import/resync. It skips native-hosted shows, honors show-scoped identity, and remains repeatable without creating duplicate GUID/enclosure entries.

Set `PODCAST_REFRESH_TOKEN` for scheduled calls. An authenticated editor can also trigger a refresh manually.

## Backup

Back up both the database and object storage. The database contains show identity, stable GUIDs, migration/distribution state and aggregate analytics; object storage contains native audio/artwork. Restoring only one side is not a complete podcast restore.

Reference runtime tables are in `db/podcast_hosting.sql`.
