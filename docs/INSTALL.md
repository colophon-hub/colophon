# Installing Colophon

Colophon is the publishing layer. It does not sell a domain or act as a DNS provider.

A normal independent setup has four pieces: a domain, DNS, hosting, and Colophon. The domain can be attached after the application is already running, so somebody can reach the newsroom and publish before learning DNS.

## Supported production setup today

The current supported production architecture is Cloudflare Pages/Workers-style Functions with:

- a D1 database bound as `BF_DB`
- persistent R2-compatible media storage bound as `colophon_MEDIA_BUCKET`
- the Vite frontend build
- the Functions under `functions/`

Required secrets are `colophon_ADMIN_TOKEN` and `colophon_SESSION_SECRET`.

## First login

1. Deploy the application.
2. Open `/login` and sign in.
3. Open the newsroom.
4. Choose **Simple Blog**, **Media Publication**, **Everything**, or a custom set of publishing tools.
5. Enter the publication name and optional editor/logo information.
6. Finish setup and start with **New Article**.
7. Connect a public domain later from Settings when ready.

Module choices and publication identity are stored in the site database so every editor sees the same interface.

## Domain setup

Colophon is provider-neutral. The deployment adapter reports the DNS record the current host expects. Copy that record into whichever service currently manages DNS, then confirm the host sees the domain and HTTPS is active.

Never copy a DNS target from somebody else's Colophon installation.

## Other hosts

Docker/VPS support is a target, but it should not be advertised as one-command deployment until a recipe supplies the frontend runtime, server/API runtime, persistent SQL-compatible storage, persistent media storage, secrets, scheduled jobs, backups, routing, HTTPS, and upgrades.

## Optional module configuration

The core server can run without the integrations below. Configure only the features the publication uses.

### Verified campaign signatures

Configure `SIGNATURE_EMAIL_PROVIDER` as `resend` or `webhook`, plus `SIGNATURE_EMAIL_FROM` and the provider settings documented in `CAMPAIGN_SIGNATURES.md`. Set a random `SIGNATURE_RATE_SALT` on shared servers.

### Native podcast hosting

Native audio/artwork uses `colophon_MEDIA_BUCKET` and `BF_DB`. Scheduled external-feed refresh can authenticate with `PODCAST_REFRESH_TOKEN`; the external distribution worker can authenticate with `EPISODE_WORKER_TOKEN`. Optional YouTube/PeerTube adapter endpoints are documented in `PODCAST_HOSTING.md`.

### Public-records lookup

`FOIA_GOV_API_KEY` enables the optional editor-only U.S. federal agency directory. The Public Records Desk itself does not require this integration and remains jurisdiction-neutral.

## Optional shared-server account-security secrets

Shared/server installations that allow users to enroll TOTP must configure a high-entropy encryption secret of at least 32 characters:

```text
COLOPHON_2FA_ENCRYPTION_KEY=replace-with-a-long-random-secret
```

Optional labels:

```text
COLOPHON_TOTP_ISSUER=Colophon
COLOPHON_WEBAUTHN_RP_NAME=Colophon
```

Back up the encryption key with the rest of the deployment secrets. Rotating or losing it makes existing encrypted TOTP enrollments unusable.

Passkeys use the production request origin/hostname as their WebAuthn origin and relying-party id. Production passkeys therefore expect a stable HTTPS origin.

