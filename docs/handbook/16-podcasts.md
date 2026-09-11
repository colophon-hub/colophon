# Podcasts: Shows, RSS Import, Hosting, and Directory Feeds

Each podcast is its own show.

## Show list

Columns: Show, Episodes, Source RSS, Colophon RSS, Last synced, Actions.

Actions include Podcast Settings / Import RSS, Open Default RSS Feed, Add Podcast and per-show Manage / Import.

## Episode tables

Each show displays Title, Episode, Season, Duration, Homepage title, Status, Published and Actions.

Show-level homepage title can be Image only, Title below image, or Title over image. Individual episodes can override.

## Source RSS migration/import

Paste the show's current/source RSS and **Preview source feed**.

**Refresh saved source** previews the stored feed.

Selection actions: Select new, Select first 250, Clear.

One import/resync request currently handles up to 250 episodes. Large archives can be moved in repeated batches.

**Import channel settings** can update title, description, author, artwork, language, category, owner information and explicit state.

**Import selected** creates selected episodes.

**Resync selected** updates selected imported episodes.

## Feed identity

Canonical Colophon RSS, Canonical public base URL, Podcast title, Author, Description, Website URL and Default cover art.

## Directory metadata

Language, Category, Owner name, Owner email, Audio host URL/base and Explicit show.

Owner email may be used/exposed for directory verification, so use an appropriate address.

## Canonical feed

The show-specific Colophon RSS is the feed intended for podcast directories.

The generic podcast-format website feed is not a substitute.

## Migration

Verify imported archive/GUIDs/enclosures, establish the canonical Colophon feed, use old-host redirect/migration controls where supported, update directory settings where needed, and keep transition redirects alive.

Creating a new feed does not magically inform every podcast directory. Humans did, in fact, build that system.
