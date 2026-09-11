# Backups, `.colophon` Portability, Export, and Restore

Backups are normal operations.

## Portable `.colophon`

Can include setup, public config, native content, collections, publication projects, podcast settings, campaign data, translations, feed settings, media metadata/local media and format/schema metadata depending on export mode.

## Desktop automatic backups

Automatic backups can be On/Off, Daily/Weekly, retaining 3/7/14/30 copies.

Actions: Back up now, Open backup folder, Backup help.

Same-computer backups do not protect against disk loss. Export elsewhere too.

## Verified server export

Current snapshot coverage includes native content/revisions, taxonomy, safe user identity/role metadata, audit events, media metadata, collections, campaigns/revisions/coverage, investigations/revisions, publications, sites/domains, feed settings, podcast settings and public config.

Password hashes/salts are excluded.

Server snapshot media is metadata/public URLs, not necessarily duplicate binary objects.

If required datasets/manifest are incomplete, export refuses to download rather than producing a reassuringly useless backup.

## Restore

Before import: make a fresh backup, verify compatibility, understand merge/replace behavior, verify media/feeds/podcast GUIDs, and inspect public routes after.

A backup never restore-tested is a hypothesis.
