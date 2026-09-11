# Feeds & Syndication

Feeds & Syndication controls website-content RSS and the live feed manifest.

## Actions

Open Public Feeds, Reset, Save Feed Settings, Refresh live manifest, Open main RSS and (when configured) Open legacy/default podcast alias.

Reset/save operates against production settings and refreshes the manifest.

## Status

Shows published records, live endpoints, podcast shows and podcast episodes.

Warns when public podcast episodes are not assigned to a show.

## Podcast syndication table

Read-only here. Shows Show, Episodes, Source RSS, Colophon RSS, Last synced and Manage show.

Podcast changes belong in Podcasts.

## Public feeds page

Page title and Intro copy affect the human-readable `/feeds` page, not podcast metadata.

## Website-content feed toggles

Everything, Formats, Projects, Collections, Public byline labels, Topics and Series.

Podcast show feeds remain first-class feeds managed by Podcasts.

## Concepts

Formats are broad content lanes.

Projects are public bodies-of-work buckets.

Collections are curated bodies/packages.

Public byline labels are public identities and may be pseudonyms/collectives.

Topics are subject tags.

Series are recurring lines of work.

## Aliases

One mapping per line: `old label => new label`.

## Hidden terms

Suppress wrong/imported public feed terms without necessarily rewriting source records.

## Diagnostics

Download feed manifest JSON for debugging/archiving/tooling. RSS clients consume XML endpoints, not the manifest JSON.

Expand live endpoint paths to inspect generated feeds.
