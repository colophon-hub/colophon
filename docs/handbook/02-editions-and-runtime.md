# Browser/PWA, Desktop, and Server Editions

Colophon has three practical runtime models.

## Browser / PWA

Publication records live in IndexedDB under the browser profile/site origin. Media is stored as browser-local blobs. No hosted account is required.

It is good for quick/local/offline-first use. Clearing browser/site data can remove the local publication, so export regularly.

A service worker caches the application shell/static assets after a successful load. Local editing can continue offline. External integrations still require their network services.

## Desktop

Desktop packages the interface in Electron. Data uses local SQLite and filesystem media in the OS application-data directory. Its internal server binds to localhost only.

Desktop is better for large media libraries and heavy PrintLab/AudioLab use.

## Shared/self-hosted server

The current supported production architecture uses a Vite frontend, Pages/Workers-style Functions, D1 as `BF_DB`, and persistent R2-compatible media storage.

Server installs add collaborative accounts, analytics, audit history, domains and shared persistence.

## Why menus differ

A menu item can be absent because of runtime, disabled module, or insufficient permission. Missing does not automatically mean broken.
