# Core software and publication data

Colophon is the publishing software. A publication using Colophon supplies its own identity, campaigns, investigations, contributors, social accounts, donation links, and editorial material as data.

Core code owns the reusable models and tools: content, campaigns, investigations, media, correspondence, podcasts, print, translations, feeds, settings, APIs, browser-local storage, backups, and hosted persistence. Real publication projects should not be hardcoded or protected in the application source.

Fresh installs start without publication campaigns or investigations. Existing installations keep their stored records during schema normalization.

## Campaign states

Campaign state has three separate jobs.

**Publication state** controls page visibility: `draft`, `published`, or `archived`.

**Lifecycle** describes the campaign itself: `active`, `inactive`, `completed`, or `archived`.

**Moderation** applies to public feed/archive rows: `automatic`, `featured`, or `hidden`. Hidden rows stay stored but are excluded from public output. Featured rows are editorially elevated without changing the campaign's publication or lifecycle state.

Older campaign records using the former `campaignStatus` field are accepted as migration input and normalized into the lifecycle field. New saves use `lifecycleStatus`.

## Publication identity

The global public-site configuration stores publication identity separately from product code. It can define the publication name, short name, site URL, logo, correspondence label, default social identity, contact email, and footer identity.
