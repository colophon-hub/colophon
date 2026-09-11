# Troubleshooting

## Missing menu item
Check module, runtime and permission.

## Published post not where expected
Check status, display/homepage settings, collection, taxonomy, feed rules and direct URL.

## Autosave failed
Do not reload. Try Save Draft and diagnose repeated failures via Site Health/connectivity.

## Legacy recovery loaded
It is not server-persisted until explicit Save/Publish.

## Media upload/404
Check file type, notices, storage binding/quota, registry, object existence, public URL and Site Health.

## Missing alt
Fix media/content metadata; Site Health can find candidates.

## Public page has no obvious post
Use Pages → Edit live.

## Domain failure
Check Colophon record, DNS, host verification and HTTPS.

## Podcast absent from show feed
Check publish state, show assignment, enclosure, manifest and show-specific RSS.

## Podcast appears in generic feed but not apps
Generic format RSS is not the show feed.

## Directory still uses old host
Use redirects and directory-side update tools.

## Ugly imported feed terms
Use aliases/hidden terms.

## Translation not public
Check status; imports begin in review.

## Course progress missing
Restore exported progress JSON if available.

## Browser publication missing
Restore from `.colophon`; browser/site data may have been cleared.

## Analytics missing
Server feature/permission/config.

## Weird Analytics day boundary
Current Today/daily reporting uses Pacific Time.

## Users/Audit missing
Server/runtime permission.

## PrintLab crop wrong
Check mode, fit, margins, crop, orientation and final print preview.

## AudioLab render not publishable
Upload a public master/delivery file. Local-only URLs are not RSS-ready.

## Transcript import wrong
Validate TXT/SRT/VTT.

## Campaign preview blocked
Allow pop-up, retry Save + Preview.

## Campaign deadline wrong
Check wall time and timezone.

## Investigation cannot save
Title and slug are required.

## Backup refuses export
Fix incomplete required datasets/backend rather than accepting a partial snapshot.

## Editorial or infrastructure?
Use editor/settings for editorial state and Site Health for DB/storage/deployment.
