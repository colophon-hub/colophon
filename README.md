# Colophon

Colophon is free, self-hostable publishing software for independent publications, editorial collectives, archives, podcasts, campaigns, and print work.

It brings articles, projects, media, feeds, podcasts, campaigns, translations, print layouts, basic audio work, analytics, users, and site settings into one publishing workspace. Publication identity and public branding are configuration, not hard-coded project content.

## Ways to use Colophon

### Browser / PWA

The browser edition is local-first. A publication can be started without an account, domain, or server. Structured data and local media stay in browser storage until they are explicitly exported or published. Use portable backups for work you need to keep.

See `docs/BROWSER_PWA.md`.

### Desktop

The Electron edition stores structured data in local SQLite and media in the application-data directory. It is useful for larger media libraries, offline-heavy work, AudioLab, PrintLab, and filesystem access.

See `docs/DESKTOP.md`.

### Self-hosted server

The server edition supports shared publications with normal user accounts, server-backed storage, and a public web address. The current backend supports Cloudflare Pages/Workers-style Functions with D1 and R2-compatible storage, while deployment-specific behavior is kept behind adapters where practical.

See `docs/INSTALL.md`.

## Publishing modules

A publication can expose only the tools it needs. First-run presets include Simple Blog, Media Publication, Everything, and Custom. Individual modules can be enabled or disabled later in settings.

## Portable publications

New portable exports use the `.colophon` format. They can contain publication setup, content, collections, print/publication projects, podcast settings, campaigns, translations, public configuration, feed settings, media metadata, and embedded local media files. Legacy portable-backup import details are documented in `COMPATIBILITY.md`.

## Development

```bash
npm install
npm run dev
```

Browser/PWA development:

```bash
npm run dev:pwa
```

Full checks:

```bash
npm run check
```

## Storage boundaries

- browser/PWA: IndexedDB for publication records and media blobs
- desktop: local SQLite plus filesystem media
- self-hosted/server: configured database and object storage

Local storage used for small UI or reminder state is not a second authoritative publication database. Local editions do not require a login; server editions use normal authentication and access controls.

Colophon ships as software, not as a copy of any publication. A fresh installation contains no production articles, campaigns, accounts, domains, analytics, or organization branding.

## License

GPL-3.0. See `LICENSE`.
