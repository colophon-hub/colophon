# Why Colophon?

Colophon is publishing software for people who want to own the publication, the files, and the exit route.

It is designed for independent publications, editorial collectives, archives, podcasts, campaigns, zines, and small organizations that need more than a bare blog but do not want their publishing workflow tied to a hosted platform.

Colophon is not trying to be a universal website builder. It is a publication workspace with browser-local, desktop, and self-hosted modes, portable publication backups, and modules that can be enabled only when they are useful.

## The short version

Choose Colophon when you want:

- a publication you can begin without creating an account first;
- browser-local and desktop workflows as well as a shared self-hosted server;
- articles, archives, feeds, podcasts, campaigns, translations, print projects, media, and editorial tools in one workspace;
- portable `.colophon` exports that can carry publication data and local media;
- publication identity kept in configuration instead of hard-coded into the software;
- a GPL-licensed codebase that can be changed, forked, moved, and redistributed;
- a deliberately small project whose direction can still be shaped by its users.

Choose something else when its strengths fit the job better. WordPress has an enormous plugin/theme ecosystem. Ghost is especially strong for creator publications, memberships, and newsletters. WriteFreely is excellent when the goal is intentionally minimal writing and publishing.

Colophon is aimed at a different middle ground: **a portable newsroom rather than a general-purpose site builder or a single-purpose writing tool.**

## Practical comparison

This compares the projects' normal self-hosted shape, not every possible plugin, integration, or custom deployment.

| | Colophon | WordPress | Ghost | WriteFreely |
|---|---|---|---|---|
| Primary focus | Independent publication workspace | General-purpose CMS and site ecosystem | Professional publishing, newsletters, memberships | Minimal writing and publishing |
| License | GPL-3.0 | GPLv2 or later | MIT | AGPL |
| Self-hostable | Yes | Yes | Yes | Yes |
| Local-first browser edition | Yes, IndexedDB-backed PWA mode | Not its normal production model | No | No |
| Desktop edition | Yes, Electron + local SQLite/media | Not its normal production model | No | No |
| Shared server edition | Yes | Yes | Yes | Yes |
| Current supported server path | Vite + Pages/Workers-style Functions + D1 + R2-compatible storage | PHP + MySQL/MariaDB + HTTPS | Ubuntu + Node.js + MySQL + NGINX + systemd in the recommended production stack | Executable with SQLite or MySQL |
| Portable publication bundle | `.colophon` export/import, including structured publication data and optional embedded media | Export/import tools exist; full-site portability commonly depends on the site's stack/plugins | Content export/import and migration tooling | Database/files can be moved; no Colophon-style publication bundle |
| Built around optional publishing modules | Yes | Primarily plugins/themes | Integrations/themes/apps | Intentionally smaller feature surface |
| Project maturity | Early, v0.x | Very mature | Mature | Mature |

Official deployment references:

- WordPress: https://wordpress.org/about/requirements/
- Ghost: https://docs.ghost.org/install/ubuntu
- WriteFreely: https://writefreely.org/start

## What "local-first" means here

The browser/PWA edition can start a publication without an account, domain, or server. Structured records and local media remain in browser storage until explicitly exported or published.

The desktop edition keeps structured publication data in local SQLite and media in the application's data directory.

That means infrastructure can come later. A person or collective can begin organizing work locally, export it, move machines, and later publish through a server installation.

Local-first does **not** mean "a browser tab is a backup." Export important work and keep copies elsewhere.

## What Colophon includes

Colophon currently has publishing surfaces for articles and archives, collections, podcasts and feeds, campaigns, translations, media management, print/publication projects, AudioLab, PrintLab, analytics, users, site settings, and editorial workflows.

Installations can expose a simpler subset rather than presenting every tool to every publication.

The goal is not maximum feature count. The goal is to keep the pieces an independent publication commonly has to scatter across several services inside one portable publishing system.

## Where Colophon is deliberately different

### Publication identity is data

A fresh Colophon installation is not a copy of the publication that happened to develop the software. Names, logos, navigation, public copy, accounts, analytics, campaigns, and publication content belong to an installation, not the upstream codebase.

### Leaving should be normal

Portable `.colophon` exports are part of the product model. A publishing system should not become the reason a publication cannot move.

### Server ownership is optional at the beginning

The PWA and desktop editions are useful without a server. The shared server edition is there when multiple editors, a public address, or durable online publishing require it.

### Specialized tools are allowed

A publication may need podcast feeds, a campaign hub, a print layout, a translation workflow, or an archive search. Colophon does not force those jobs to masquerade as generic blog posts simply because traditional CMS software began with posts and pages.

## Current limitations

Colophon is young software.

The current supported production server architecture is Pages/Workers-style Functions with D1 and R2-compatible object storage. Docker/VPS deployment is a target, but it should not be advertised as a one-command supported path until a deployment recipe covers the API runtime, persistent database and media storage, secrets, jobs, backups, routing, HTTPS, and upgrades.

The browser/PWA and desktop editions also have different storage and collaboration boundaries from the shared server edition. Read the edition documentation before choosing one for important work.

## IndieWeb direction

Colophon's goals overlap with the IndieWeb principle of owning your domain and your content.

The plan is to add standards support where it creates real interoperability rather than treating IndieWeb as a marketing badge:

1. microformats2 on public entries;
2. Webmention receive/send support with moderation;
3. Micropub as a later publishing API once authentication and the content model are stable.

See [INDIEWEB.md](INDIEWEB.md).

## Start here

- [Browser/PWA edition](BROWSER_PWA.md)
- [Desktop edition](DESKTOP.md)
- [Self-hosted installation](INSTALL.md)
- [Publishing online](PUBLISH_ONLINE.md)
- [NoBlogs migration notes](NOBLOGS_MIGRATION.md)
- [Compatibility notes](../COMPATIBILITY.md)

If Colophon fits, use it. If it almost fits, open an issue. If it needs to become something fundamentally different, fork it. That is what free software is for.
