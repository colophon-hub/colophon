# Product-maturity implementation notes

This source tree adds a product-maturity phase on top of Colophon 0.1.6. The package version is intentionally set to 0.1.6 until the updated source has passed the full build/release checks in the environment that will publish it.

## Implemented

- optional TOTP two-factor authentication for shared-server user accounts;
- one-use recovery codes stored only as hashes;
- ES256/P-256 WebAuthn passkey registration, naming, removal, and sign-in;
- server-side rate limiting on password, second-factor, passkey, and account-security paths;
- Light / Dark / System application appearance;
- optional Markdown import/source/export workflow without replacing WYSIWYG;
- syntax-highlighted published code blocks with accessible copy controls;
- declarative import/export/switchable themes;
- microformats2 `h-entry`, `h-feed`, `p-name`, `e-content`, URL/date/author/photo/category markup;
- configurable `rel=me` identity links;
- Webmention receive, verification, moderation, approved rendering, outbound discovery/sending, and send-state logging;
- a versioned trusted build-time extension hook API with failure isolation;
- optimistic native-content conflict detection instead of simultaneous real-time editing.

## Schema changes

Public configuration advances from schema version 5 to 6 and adds `indieweb` and `themes` fields. Existing configuration is normalized forward.

Native content gains an additive `sourceFormat` field (`html` or `markdown`). Existing entries default to `html`.

Shared-server account-security and Webmention tables are created lazily by their server modules. SQL snapshots are also included in `db/account_security.sql` and `db/webmentions.sql` for operators that prefer explicit schema application.

## Required server secret for TOTP

A shared-server installation must configure a high-entropy value of at least 32 characters before TOTP enrollment can work:

```text
COLOPHON_2FA_ENCRYPTION_KEY=replace-with-a-long-random-secret
```

Optional labels:

```text
COLOPHON_TOTP_ISSUER=Colophon
COLOPHON_WEBAUTHN_RP_NAME=Colophon
```

Existing password login continues to work if that encryption key is absent. TOTP simply cannot be enrolled until it is configured.

## Deliberately deferred

- real-time Google-Docs-style simultaneous editing / CRDT infrastructure;
- full Micropub;
- IndieAuth authorization-server behavior;
- arbitrary uploaded executable plugins/themes;
- passkey algorithms beyond ES256/P-256 in the first implementation.

## Release gate

Before changing the version/tag, run:

```bash
npm ci
npm run check
npm run desktop:pack
```

Then manually verify at least:

1. fresh-install onboarding;
2. an existing publication upgrade;
3. `.colophon` export/import;
4. browser/PWA offline editing;
5. TOTP enroll → second-factor login → recovery-code login → disable;
6. passkey register → passkey login → remove on the production HTTPS origin;
7. Markdown import → render → visual-editor transition;
8. theme import → activate → export → remove;
9. a real public article in a microformats2 parser;
10. fake Webmention rejection and approved Webmention rendering;
11. outbound Webmention failure not blocking publication;
12. Light/Dark/System across public pages, newsroom, AudioLab, and PrintLab.
