# Upload and public-data security

Colophon does not trust a filename extension or browser-supplied MIME header as proof of file type. Shared upload validation checks known file signatures, rejects executable signatures, checks MIME/signature consistency and validates text/SVG payloads. Active SVG constructs such as scripts, event handlers, foreign objects and `javascript:` links are rejected.

The main Media Library and campaign-contributor upload paths share this validation. PDF and document uploads are represented as typed media instead of being treated as images. Media responses set `X-Content-Type-Options: nosniff` and use bounded upload sizes.

Public native-content API responses are projections, not raw editorial records. Fields such as source/editorial notes, workflow-only state, private URLs, internal metadata, storage keys, contributor identifiers and provider data are stripped. Related assets are projected separately so internal storage keys cannot leak through a public content response.
