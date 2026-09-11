# Colophon

**Free, self-hostable publishing software for independent publications, collectives, archives, podcasts, campaigns, and print work.**

Colophon is a portable publishing workspace rather than a hosted platform. Start locally in a browser, use the desktop app for an offline-first newsroom, or run a shared publication on your own infrastructure. Publication identity is configuration, not hard-coded upstream content.

[Try the browser edition](https://colophon-hub.github.io/colophon/) · [Download the latest release](https://github.com/colophon-hub/colophon/releases/latest) · [Install a self-hosted server](docs/INSTALL.md) · [Why Colophon?](docs/WHY_COLOPHON.md)

> **Project status:** Colophon is early software (`0.x`). It is usable and publicly released, but interfaces, deployment adapters, and file formats may continue to evolve. Keep portable backups of important work.

## What Colophon is for

Colophon is built for people who publish more than a stream of posts but do not want to stitch an entire publication together from unrelated hosted services.

A publication can use only the modules it needs, including:

- articles, pages, archives, search, collections, and feeds;
- podcasts and podcast RSS;
- campaigns and campaign updates;
- translations and multilingual publishing workflows;
- media management;
- print and publication projects;
- AudioLab and PrintLab;
- analytics, users, settings, and editorial workflows;
- optional Markdown authoring and syntax-highlighted code blocks;
- Light / Dark / System interface appearance;
- reusable declarative themes;
- optional TOTP two-factor authentication and passkeys for shared-server accounts;
- IndieWeb microformats2, configurable `rel=me`, and moderated Webmention receive/send;
- a small versioned build-time extension hooks API.

First-run presets include **Simple Blog**, **Media Publication**, **Everything**, and **Custom**.

## Three ways to run it

### Browser / PWA

The browser edition is local-first. You can start a publication without an account, domain, or server. Structured publication data and local media stay in browser storage until you explicitly export or publish them.

Use portable backups for anything you care about. A browser profile is not an archival strategy, despite humanity's heroic tradition of discovering that after deleting it.

See [Browser / PWA](docs/BROWSER_PWA.md).

### Desktop

The desktop edition uses Electron, local SQLite, and filesystem media storage. It is intended for larger media libraries, offline-heavy work, AudioLab, PrintLab, and workflows that benefit from normal filesystem access.

Current release builds are published for Windows, macOS, and Linux.

See [Desktop](docs/DESKTOP.md) or [download the latest release](https://github.com/colophon-hub/colophon/releases/latest).

### Self-hosted server

The server edition supports shared publications with normal user accounts, persistent server-backed storage, and a public web address.

The currently supported production architecture is a Vite frontend with Pages/Workers-style Functions, D1, and R2-compatible object storage. Docker/VPS support is a target, but is **not** yet advertised as a one-command supported deployment.

See [Installing Colophon](docs/INSTALL.md).

## Portable publications

Colophon uses a portable `.colophon` format. Exports can contain publication setup, structured content, collections, print/publication projects, podcast settings, campaigns, translations, public configuration, feed settings, media metadata, and embedded local media.

The goal is simple: leaving a machine or hosting setup should be an ordinary operation, not a hostage negotiation.

See [Compatibility](COMPATIBILITY.md).

## Why not just use WordPress, Ghost, or WriteFreely?

You might want to. They are good projects with different strengths.

WordPress has an enormous theme and plugin ecosystem. Ghost is especially strong for professional publishing, memberships, and newsletters. WriteFreely is intentionally small and excellent for straightforward writing and publishing.

Colophon is aimed at a different middle ground: **a portable newsroom with specialized publishing tools, local-first editions, and a shared self-hosted edition.**

See the full [Why Colophon? comparison](docs/WHY_COLOPHON.md).

## IndieWeb and interoperability

Colophon's goals overlap heavily with the IndieWeb: own your domain, own your content, and make migration survivable.

Colophon now emits **microformats2** for published entries/listings, supports configurable **`rel=me`** identity, and the shared/server edition can receive, moderate, render, discover, and send **Webmentions**. **Micropub** remains a later target because the external IndieAuth/token boundary should be designed correctly rather than improvised from admin-session credentials.

See [IndieWeb support](docs/INDIEWEB.md).

## Install for development

```bash
git clone https://github.com/colophon-hub/colophon.git
cd colophon
npm install
npm run dev
```

Browser/PWA development:

```bash
npm run dev:pwa
```

Run the full test and build checks:

```bash
npm run check
```

## Storage boundaries

| Edition | Authoritative local/server storage |
|---|---|
| Browser / PWA | IndexedDB for publication records and media blobs |
| Desktop | local SQLite plus filesystem media |
| Self-hosted server | configured database plus object storage |

Small UI preferences and reminder state may use browser storage, but local storage is not treated as a second authoritative publication database.

Local editions do not require login. Shared server editions use normal authentication and access controls.

## Fresh installs are neutral

Colophon ships as software, not as a copy of somebody else's publication.

A fresh installation contains no production articles, campaigns, accounts, domains, analytics, organization branding, or publication-specific identity. Those belong to the installation using Colophon, not to the upstream codebase.

## Contributing

Bug reports, documentation fixes, accessibility work, translations, deployment adapters, interoperability work, testing, and code contributions are welcome.

Start with [CONTRIBUTING.md](CONTRIBUTING.md). For an idea that is not yet scoped, open an issue before building a large change so two people do not independently invent the same wheel with incompatible lug nuts.

## Documentation

- [Why Colophon?](docs/WHY_COLOPHON.md)
- [Install / self-host](docs/INSTALL.md)
- [Browser / PWA](docs/BROWSER_PWA.md)
- [Desktop](docs/DESKTOP.md)
- [Publishing online](docs/PUBLISH_ONLINE.md)
- [IndieWeb support](docs/INDIEWEB.md)
- [Markdown authoring](docs/MARKDOWN.md)
- [Themes](docs/THEMES.md)
- [Extension hooks](docs/EXTENSIONS.md)
- [Product-maturity implementation notes](docs/RELEASE_PRODUCT_MATURITY.md)
- [NoBlogs migration notes](docs/NOBLOGS_MIGRATION.md)
- [Compatibility](COMPATIBILITY.md)
- [Security and authentication](SECURITY_AUTH.md)

## License

Colophon is free software licensed under **GPL-3.0**. See [LICENSE](LICENSE).

Use it, change it, fork it, move it, and redistribute it under the terms of the license.
