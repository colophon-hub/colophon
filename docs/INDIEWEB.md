# IndieWeb support

Colophon's basic goals already overlap with the IndieWeb: own your domain, own your content, publish from infrastructure you control, and preserve a practical way to move.

This document tracks concrete interoperability support. It is intentionally conservative. Colophon should not claim a standard until a public installation can actually validate and use it.

## Status

| Building block | Status | Notes |
|---|---|---|
| Own-domain publishing | Supported | Self-hosted installations can publish on an independently controlled domain. |
| RSS / feeds | Supported | Colophon has public feed support, including podcast feeds. |
| microformats2 | Implemented | Public posts expose `h-entry`, `p-name`, `e-content`, canonical `u-url`, publication/update dates, author data when available, featured image metadata, and categories/tags. Homepage listings expose `h-feed` with nested `h-entry` cards. Validate a real deployed URL before treating a particular installation as proven. |
| `h-card` identity | Implemented | Publication/author identity is configurable and rendered as `h-card` metadata where available. |
| `rel=me` | Implemented | Multiple publication/author identity URLs can be configured without platform-specific assumptions. |
| Webmention receiving | Shared/server | `/api/webmention` verifies source → target links, persists mentions, rate-limits submissions, and keeps remote content pending until editorial moderation. |
| Webmention sending | Shared/server | Linked external pages are checked for Webmention discovery after explicit published saves; failures are recorded and do not block publication. |
| Micropub | Deferred | The current authentication model does not yet provide the external authorization/token boundary needed for a durable Micropub implementation. |
| IndieAuth | Deferred / evaluate | Evaluate together with Micropub rather than inventing an insecure parallel token scheme. |

## microformats2 and identity

Individual published post pages expose:

- `h-entry` on the entry;
- `p-name` on the title;
- `e-content` on the published body;
- canonical `u-url`;
- `dt-published` and `dt-updated` when available;
- `p-author h-card` when author/publication identity is configured;
- `u-photo` / `u-featured` for featured imagery when present;
- `p-category` for categories/tags.

Homepage/feed cards expose `h-feed` / nested `h-entry` markup. Shared-server post shells also emit parser-visible post metadata before the React application hydrates so validators and non-JavaScript consumers are not required to execute the SPA first.

Publication identity settings include optional author/display name, profile URL, photo URL, and multiple `rel=me` URLs. These are installation configuration, never hard-coded upstream identity.

## Webmention

The shared/server edition exposes a discoverable Webmention endpoint.

Receiving performs:

1. same-publication target validation;
2. HTTP/HTTPS source validation;
3. bounded source fetching and redirect handling;
4. verification that the source actually links to the target;
5. durable D1 storage;
6. rate limiting and literal local/private-address rejection;
7. pending-by-default editorial moderation;
8. safe text-only extraction from remote HTML;
9. approve / reject / spam / delete / reverify controls.

Only approved mentions render publicly. Remote scripts, styles, and arbitrary HTML are never inserted into the publication.

Sending discovers Webmention endpoints on linked external pages after an explicit published save. Sending is asynchronous where the runtime provides `waitUntil`; failure is logged and never blocks the content save.

Browser/PWA-local and desktop-local publications do not pretend to receive Webmentions because they do not have an externally reachable public endpoint.

## Micropub / IndieAuth

Micropub remains deliberately deferred. Colophon should first expose a standards-appropriate external authorization/token boundary. The current user-session and bootstrap-token mechanisms are for the Colophon administration interface and must not be repurposed into an improvised public publishing token merely to tick a standards checkbox.

When implemented later, a first Micropub surface should remain small: create/update/delete posts, title/content, categories/tags, publication status, and media through a documented media boundary.

## Validation before public claims

The implementation is present in the codebase, but a deployed installation should still be checked with current microformats/IndieWeb tooling and at least one real Webmention peer before that installation is described as externally validated. Protocols have a charming habit of making one missing slash everybody's problem.

## Principle

Interoperability should make a Colophon publication easier to own, move, connect, and publish. If a proposed standard integration does none of those things, it should not be added merely so the README gets another badge.
