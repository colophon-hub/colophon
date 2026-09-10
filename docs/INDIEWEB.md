# IndieWeb support

Colophon's basic goals already overlap with the IndieWeb: own your domain, own your content, publish from infrastructure you control, and preserve a practical way to move.

This document tracks concrete interoperability support. It is intentionally conservative. Colophon should not claim a standard until a public installation can actually validate and use it.

## Status

| Building block | Status | Notes |
|---|---|---|
| Own-domain publishing | Supported | Self-hosted installations can publish on an independently controlled domain. |
| RSS / feeds | Supported | Colophon has public feed support, including podcast feeds. |
| microformats2 | Next | Add `h-entry`/`p-name`/`e-content` metadata to public entries, then validate against IndieWeb tooling. |
| `h-card` identity | Planned | Publication/author identity needs a clean configuration-to-markup path. |
| `rel=me` | Planned | Should be configurable per publication/author rather than hard-coded. |
| Webmention receiving | Planned | Requires endpoint, verification, storage, moderation, abuse controls, and rendering policy. |
| Webmention sending | Planned | Discover endpoints from linked pages and send after publication/update. |
| Micropub | Later | Useful external publishing API, but should follow a stable content model and authentication story. |
| IndieAuth | Later / evaluate | Evaluate alongside Micropub rather than inventing a parallel auth system. |

## Phase 1: microformats2

Start with published article/post pages.

Minimum useful entry markup:

- `h-entry` on the entry container;
- `p-name` on the title;
- `e-content` on the published body;
- `dt-published` using the machine-readable publication timestamp when available;
- `u-url` on the canonical post URL;
- `p-author h-card` when author identity is available as structured data.

After implementation, test real published URLs with the current IndieWeb/microformats validators. Do not mark the feature complete based only on class names existing in JSX.

Archive/home listings can then expose `h-feed` plus nested `h-entry` markup.

## Phase 2: identity

Publication and author identity should be configuration, not upstream constants.

Add structured settings for:

- canonical home URL;
- display name;
- avatar/logo;
- optional author profile URL;
- `rel=me` URLs.

Render those settings as `h-card`/`rel=me` where appropriate.

This is also the point where a Colophon-powered site can become a useful IndieWeb identity rather than merely emitting parser-friendly article markup.

## Phase 3: Webmention

Webmention is a good fit for Colophon because independent publications should be able to receive references and responses without depending on a centralized social platform.

Receiving should include:

1. public endpoint discovery;
2. source/target validation;
3. fetching and verifying the source;
4. durable storage;
5. spam/abuse controls;
6. editorial moderation;
7. safe rendering that does not trust arbitrary remote HTML;
8. re-verification/removal when a source changes or disappears.

Sending should:

1. discover Webmention endpoints on linked targets;
2. enqueue sends after publication/update;
3. retry conservatively;
4. expose failures to editors without blocking publication.

## Phase 4: Micropub

Micropub would let external clients create and update Colophon content.

Do this only after the content model and authentication boundary are stable enough that the API can be maintained without becoming a compatibility trap.

A first implementation should support a deliberately small set:

- create article/draft;
- title/name;
- HTML or text content;
- publication status;
- categories/tags;
- media upload through a documented media endpoint;
- update/delete after create is proven stable.

## Getting Colophon listed on IndieWeb

The IndieWeb `projects` page currently expects projects to have community adoption and at least one key IndieWeb building block. That means the correct order is:

1. ship and validate at least microformats2 support;
2. have at least one real Colophon site using it;
3. participate in IndieWeb as an actual person/project user, not merely arrive to drop a link;
4. document the working example;
5. add Colophon to the relevant IndieWeb wiki/project pages once it meets their inclusion criteria.

Useful starting points:

- https://indieweb.org/Getting_Started
- https://indieweb.org/projects
- https://indieweb.org/microformats
- https://indieweb.org/Webmention
- https://indieweb.org/Micropub

## Principle

Interoperability should make a Colophon publication easier to own, move, connect, and publish. If a proposed standard integration does none of those things, it should not be added merely so the README gets another badge.
