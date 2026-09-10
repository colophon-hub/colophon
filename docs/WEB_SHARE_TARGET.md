# PWA Web Share Target

The browser/PWA manifest registers Colophon as a Web Share Target for shared title, text, URL and supported media.

Incoming shares are never published automatically. Browser-local installations place the share and blobs into IndexedDB and open `#/share-target` for review. Server installations require the normal authenticated contributor/editor session, validate uploaded media server-side, register accepted assets, and create a native draft before redirecting into the editor.

The workflow preserves the source URL and marks the draft source as Web Share Target. It reuses Colophon's existing native content and media systems rather than maintaining a parallel publishing database.

A server share request without sufficient authorization fails closed. Private access tokens are not placed in shared URLs; normal same-origin session cookies provide the handoff from installed PWA to server workflow.
