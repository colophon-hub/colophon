# Storage and Persistence Reference

| Runtime | Records | Media | Accounts | Backups |
|---|---|---|---|---|
| Browser/PWA | IndexedDB/browser-local DB | Browser-local blobs | No | `.colophon` export |
| Desktop | SQLite | Filesystem media | No | Automatic local + `.colophon` |
| Server | D1 in current supported architecture | R2-compatible object storage | Yes | Server snapshot + portable/full |

Treat the configured authoritative store as source of truth. Browser UI cache/preferences are not a second durable publication.
