# Browser / PWA edition

The browser edition is a local-first Colophon workspace. It is not a hosted publishing account and Colophon does not receive your publication just because you open the app.

## What local means

Publication records are stored in IndexedDB under the browser profile and site origin. Media files are stored as browser-local blobs in the same local database. Ordinary editorial API calls are handled locally instead of being sent to a Colophon server.

No account is required. Local mode does not show a normal Log Out action because there is no remote account to log out of.

Clearing browser/site data, deleting the browser profile, or some aggressive storage-cleanup tools can remove the local publication. Export a portable backup regularly.

## Starting a publication

Open the browser app and choose **Start on this device**. The first-run screen asks for a publication name, description, optional logo, and the publishing modules you need.

You can start with Simple Blog, Media Publication, Everything, or Custom. Modules can be changed later.

Finishing setup does not upload anything. It opens the newsroom using the local browser database.

## Install as an app

On supported browsers Colophon can be installed as a PWA. The installed version uses the same browser-local data store and the same publication. Installing it does not create a second cloud copy.

Chrome, Chromium, and Edge generally expose the install prompt when the PWA criteria are met. Safari and Firefox expose different install/add-to-home-screen behavior depending on platform. Colophon does not blank the app when an install API is unavailable.

## Offline use

A service worker caches the application shell and static assets after the app has loaded successfully. Writing and editing against the local database continue to work offline. The service worker does not cache Colophon API writes because browser-local API calls are handled inside the application and server-mode APIs must remain fresh.

Tools that genuinely depend on outside services will report that a server connection is required instead of pretending they completed locally.

## Media

Uploaded media is stored in the browser-local database. The PWA service worker serves those blobs back to previews through a local media route.

Browser storage quotas vary by browser, device, free disk space, and user settings. For large audio/video archives, long AudioLab sessions, or filesystem-heavy work, the desktop edition is a better fit.

## Backups and moving to desktop

Open **Back up / Publish Online** and choose **Export complete backup**. The `.colophon` file can contain:

- publication setup
- public site configuration
- posts and other native content
- collections
- publication/print projects
- podcast settings
- campaign data
- translations
- feed settings
- media metadata
- local media files
- backup format/schema metadata

Use **Import backup** in another local Colophon copy to restore it. Browser and desktop editions use the same portable format, so a publication can start in a browser and move to desktop without being rebuilt manually.

## Putting it online

A local browser publication is not public merely because it runs in a browser.

The current honest publishing path is:

1. export a portable backup
2. create or obtain a compatible Colophon server/web instance
3. import the publication there
4. use the host-provided public address
5. connect a custom domain afterward if wanted

A custom domain is optional and is not hosting by itself.

The currently tested no-cost server path is based on Cloudflare Pages/Workers-style Functions with D1/R2-compatible storage. Provider free plans and limits can change. Community/collective hosting and self-managed servers are also valid paths.

## Privacy

Browser-local mode does not create a Colophon account or upload publication content automatically. The browser build disables normal server analytics calls locally. External links or explicitly invoked network-backed tools can still contact the service they name, as expected.

## Product-maturity features

The browser/PWA edition supports Light / Dark / System interface appearance, Markdown authoring, syntax-highlighted code blocks, and declarative publication themes. The UI appearance choice is a device preference; publication themes remain part of publication configuration and portable backups.

Browser-local mode still requires no Colophon account. TOTP/passkey account security and inbound Webmention receiving apply only after a publication is running on a reachable shared server.

