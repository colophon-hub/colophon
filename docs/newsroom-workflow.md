# Newsroom workflow

Colophon supports a newsroom model in which many people can write and a smaller set of trusted editors can publish.

## Roles

- **Owner**: unrestricted control.
- **Admin**: editorial control plus users, site configuration, analytics, and system tools.
- **Editor**: content, media, review decisions, scheduling, and publishing. No user or site administration.
- **Contributor**: creates and edits their own unpublished work, uploads and manages their own media, submits and resubmits work, and participates in editorial comments. Contributors cannot publish, schedule, approve, decline, restore revisions, or edit another account's content.
- **Viewer**: read-only admin/analytics access.

Contributor capability set: `content:write`, `media:write`, `review:comment`.

Editor capability set adds `publishing:write` and `review:manage`.

## Editorial states

`draft` -> `in_review` -> `needs_revision` | `ready` | `declined`

`needs_revision` -> `in_review`

`ready` -> `scheduled` | `published`

Existing `archived` and `trash` states remain available to publishing roles.

Declining work is an editorial decision, not deletion. The content, comments, and revision history remain stored.

## Ownership and bylines

`ownerAccountId` records the stable account responsible for an unpublished piece. This is separate from the public `author`/byline field. Deleting an account does not delete its content.

Legacy content without an owner is deliberately left ownerless. Editors, admins, and owners can continue to manage it. Contributors cannot claim or edit ownerless legacy content merely by opening it.

## Server-side enforcement

The UI is not the security boundary. Cloudflare Functions check capabilities and ownership before content, media, review, comment, delete, publish, schedule, or revision-restore operations.

The old generic `canEdit` compatibility flag remains false for Contributors. This prevents older endpoints that have not yet been converted to capability checks from accidentally granting broad publication access.

## Portable content

Native content schema version 4 carries newsroom metadata with the content JSON and revision snapshots:

- `ownerAccountId`
- `ownerEmail`
- `submittedAt`
- `reviewedAt`
- `reviewedBy`
- `declinedAt`
- `declinedBy`
- `editorialComments`

These fields contain workflow metadata only. Password hashes, sessions, secrets, and authentication material are not stored in native content exports.

## Backward compatibility

No destructive database recreation is required. `admin_users.role` already stores text, so `contributor` is an additive role value. Native newsroom metadata lives inside the existing `content_json` document, and old entries normalize with empty ownership/review fields.

Media ownership is stored in the existing media metadata JSON as `contributorId`, allowing contributor-scoped edits without a table rebuild.
