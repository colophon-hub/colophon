# Install and Self-host

The repository's technical INSTALL document remains the exact deployment authority.

Current supported production shape: Vite frontend, Pages/Workers-style Functions, D1 as `BF_DB`, persistent R2-compatible media storage as `colophon_MEDIA_BUCKET`.

Required secrets currently include `colophon_ADMIN_TOKEN` and `colophon_SESSION_SECRET`.

## First deployment

Deploy → `/login` → Newsroom → first-run setup → create real Owner account → verify upload → draft/publish test → verify public route → create backup → optionally connect domain.

## Domain model

Domain + DNS + hosting + Colophon are separate pieces.

Colophon's deployment adapter reports the DNS record expected by the current host.

## Other hosts

Do not advertise one-command Docker/VPS support until a maintained recipe covers frontend, API runtime, SQL, media storage, secrets, jobs, backups, routing, HTTPS and upgrades.

## Optional integrations

Campaign signature provider settings, podcast refresh/distribution tokens/adapters and FOIA.gov editor lookup can be configured as needed.

Before editor handoff, test login, Owner, Editor, DB/schema, object storage/upload, public routes, feeds, backup and domain/HTTPS.
