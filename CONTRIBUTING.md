# Contributing to Colophon

Colophon is free software and contributions are welcome.

Useful contributions include code, bug reports, accessibility fixes, documentation, translations, deployment adapters, interoperability work, migration testing, design feedback, and real-world testing of the browser, desktop, and self-hosted editions.

## Before a large change

For a substantial feature or architectural change, open an issue first and describe:

- the problem being solved;
- who benefits;
- which edition(s) it affects;
- storage or migration implications;
- accessibility implications;
- security implications where relevant;
- how the change can be tested.

Small fixes do not need ceremony.

## Development

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

Before submitting code:

```bash
npm run check
```

That command runs the test suite and builds the normal and browser/PWA editions.

## Keep upstream neutral

Colophon is upstream software, not a bundled copy of any publication.

Do not add production publication names, domains, accounts, analytics identifiers, campaigns, editorial content, private data, or organization-specific branding to the upstream repository.

Features needed by one publication should become configurable, reusable capabilities when they belong upstream.

## Storage boundaries matter

Changes must respect the edition boundaries documented in the README:

- browser/PWA uses IndexedDB for publication records and media blobs;
- desktop uses local SQLite plus filesystem media;
- self-hosted/server uses configured database and object storage.

Do not casually create a second authoritative store for publication data.

## Security

Do not open a public issue containing credentials, tokens, private keys, private user data, or an exploitable security report.

For authentication/storage background, read [SECURITY_AUTH.md](SECURITY_AUTH.md).

## Documentation

If behavior changes, update the relevant documentation in the same contribution.

Especially keep these accurate:

- `README.md`
- `docs/INSTALL.md`
- `docs/BROWSER_PWA.md`
- `docs/DESKTOP.md`
- `COMPATIBILITY.md`
- `docs/INDIEWEB.md` when interoperability changes

## License

By contributing, you agree that your contribution is provided under the repository's GPL-3.0 license.

## Themes and extensions

Third-party presentation work should target the documented declarative theme format in `docs/THEMES.md`.

Trusted build-time integrations should target the versioned hooks documented in `docs/EXTENSIONS.md`. Do not depend on private React components, database internals, or undocumented hook names as compatibility promises. Colophon does not use an uploaded arbitrary-code plugin system as its extension model.

