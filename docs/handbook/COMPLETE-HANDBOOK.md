# Colophon 0.1.6: Complete Handbook

Verified/documentation package date: 2026-09-10


---

# Colophon Handbook

**Version:** 0.1.6  
**Audience:** publishers, editors, administrators, installers, contributors, and anyone trying to determine what a button actually does.

Colophon is a portable publishing newsroom. Depending on which modules are enabled, one installation can handle articles, archives, media, collections, campaigns, investigations, courses, podcasts, translations, RSS, publication projects, print production, audio production, analytics, accounts, domains, backups, and public-site configuration.

The interface is deliberately modular. Two Colophon installations can show different menus because the installations have different publishing modules, editions, or permissions.

## Best starting points

**New publication:** read [Quick Start](01-quick-start.md).

**New editor:** read [Newsroom](04-admin-shell-and-newsroom.md), [Posts](05-posts-and-workflow.md), and the [Editor Reference](06-editor-reference.md).

**Site administrator:** read [Settings](23-settings-and-public-site.md), [Users & Access](25-users-and-access.md), [Backups](29-backups-and-portability.md), and [Site Health](27-site-health.md).

**Podcast operator:** read [Podcasts](16-podcasts.md) and [Feeds & Syndication](18-feeds-and-syndication.md).

**Print/audio producer:** read [PrintLab](21-printlab.md) and [AudioLab](22-audiolab.md).

**Installer:** read [Install and Self-host](31-install-and-self-host.md).

**Something broke:** use [Troubleshooting](37-troubleshooting.md).

## Documentation model

Each major feature guide answers four things:

1. **What it does**
2. **When to use it**
3. **What each important control changes**
4. **What else that change affects**

For an exhaustive screen/control inventory, see `reference/UI-CONTROL-INVENTORY.csv`.

---

# What Colophon Can Do

Colophon is designed for publications that need more than a chronological blog without requiring a stack of unrelated services.

## Core editorial publishing

With the Articles module enabled, Colophon provides posts/articles, drafting and review states, scheduling, revisions and restore, autosave, categories and tags, collections, public pages, live site editing, media management, editorial QA, archives and public post routes.

## Publication identity and site presentation

Administrators can manage publication name and short name, site URL, logo, editor/correspondence label, default social identity, contact email, footer identity and copy, primary navigation, typography roles, bundled/system fonts, and self-hosted WOFF/WOFF2 fonts.

## Media

The Media Library handles publication-managed assets including images, audio, supported video, PDFs, archives, EPUB, Word/ODT/RTF, text/Markdown, and CSV.

Media records can carry descriptive and rights metadata such as title, alt text, caption, description, creator/credit, attribution, license, source URL, tags, media type, storage location, and file size.

## Collections

Collections are curated bodies of work. They can combine assigned pieces with featured pieces, timelines, downloads, galleries, updates, external links, cover media, related collections, and related pieces.

## Taxonomy

Taxonomy provides reusable structured terms. Current taxonomy types include tags, series, themes, and projects.

## Publications

The Publications system builds higher-order publication objects such as books, magazines, zines, readers, pamphlets, poster packs, campaign kits, and booklets.

## Campaigns

Campaigns are modular public campaign hubs rather than ordinary articles. They can carry campaign updates, resources, graphics, social/archive material, press coverage, signatories, primary sources, timelines, FAQ, translations, correspondence/contributor tools, and campaign-specific moderation.

## Investigations

Investigations are living evidence/reporting hubs with reader orientation, evidence/source records, chronology, public-records requests, request documents, source relationships, and open/reporting questions.

## Courses

Courses provide self-paced lessons, sections, activities and resources. Learner progress is local-first and can be exported/imported by the learner.

## Podcasts

Each podcast is a separate show with independent metadata, source RSS, imported/resynced episodes, canonical Colophon RSS, directory metadata, owner metadata, artwork, explicit flag, audio-host configuration, episode display choices, and native hosting workflow.

## Feeds and syndication

Colophon can generate and expose all-content feeds and feeds by format, project, collection, public byline, topic, series, podcast show and supported campaign feed.

## Translations

Translations support source export for Weblate, translated JSON import, editorial review states, publication states, external translation registration, translator/reviewer credit, and language-specific public destinations.

## PrintLab

PrintLab is an integrated print-production environment with Tile Sheet, Poster Split, Page Layout, Half-Fold Zine, and freeform Canvas modes.

## AudioLab

AudioLab supports source audio, recording, tracks, clips, edits, effects, mixdown/rendering, delivery files, transcripts, markers, episode metadata, and podcast/content handoff.

## Operations

Shared/server installations add individual accounts, owner/admin/editor/viewer roles, analytics, audit history, server-backed storage, domain administration, Site Health and server backups.

Local Browser/PWA and Desktop editions can operate without a hosted account.

---

# Quick Start: First Complete Publishing Loop

This is the shortest path from a fresh Colophon installation to a real published item and a recoverable backup.

## 1. Start the publication

On first run, enter the Publication name, Short description, optional Logo URL or Upload logo, and optional Primary editor.

Choose a publishing preset:

- **Simple Blog**: Articles only
- **Media Publication**: Articles, Podcasts, Translations
- **Everything**: all current modules
- **Custom**: choose modules individually

You can change modules later.

## 2. Enter the Newsroom

After setup, Colophon opens the Newsroom with the draft queue, scheduled publications, published records, media counts, recent work, revisions and enabled publishing tools.

## 3. Create an article

Use **Quick Create**, **+ New → Post**, or **Content → Add New**.

Enter a title and write the body.

## 4. Complete the publishing sidebar

Set author and publication state. Common states are Draft, Scheduled, Published, Archived and Trash. Editorial workflow also includes Review.

Add categories, tags, collections, and campaign relationships where appropriate.

## 5. Add a featured image

Use the media picker. Provide meaningful alt text if the image conveys information.

## 6. Preview

Click **Preview**. Preview saves current changes first and opens preview behavior. It is verification, not publication.

## 7. Publish

Click **Publish** and verify the public post: headline, body, links, image, alt text, author/date, narrow/mobile layout and placement.

## 8. Check archive/feed

If the item should appear in RSS, verify the correct feed.

For podcasts, verify the show's dedicated podcast feed, not merely the generic podcast-format feed.

## 9. Back up

Open **System → Backups** and create a portable backup or use Desktop automatic backup controls.

Do this now. "I will set up backups later" is one of computing's oldest forms of performance art.

The core loop is:

**configure → create → attach media → review → publish → verify → back up**

---

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

---

# First-run Publication Setup

The first-run card establishes publication identity and decides which publishing systems appear.

## Identity fields

**Publication name** sets the primary publication identity.

**Short description** describes what the publication publishes.

**Logo URL** uses an already-hosted logo.

**Upload logo** uploads an image through the media system and stores the returned URL.

**Remove logo** clears the logo from the setup draft.

**Primary editor** is an optional name/role for correspondence identity.

## Presets

**Simple Blog** enables Articles.

**Media Publication** enables Articles, Podcasts and Translations.

**Everything** enables all current modules.

**Custom** allows manual module selection.

## Modules

Current modules are Articles, Podcasts, Campaigns, Investigations, Courses, Publications, Translations, PrintLab and AudioLab.

## Finish setup

Saves configuration and marks first-run complete.

Later changes happen in Settings. Turning off a module hides its ordinary navigation/creation surfaces but does not inherently erase historical module data.

---

# Admin Shell and Newsroom Dashboard

The Newsroom is the main operational dashboard.

## Top bar

**Dashboard/product mark** returns to `/wp-admin`.

**My Site** opens the current publication and can expose Site Settings or local Back up / Publish Online controls.

**+ New** can contain Post, Podcast Episode, Media, Collection, Campaign, Investigation, Course, Publication and AudioLab Project. Entries depend on modules and permissions.

**Command palette** opens the admin command palette, generally via Cmd/Ctrl+K conventions.

**Account/local publication menu** shows server identity/logout or local export context depending on runtime.

## Rail

The rail can be collapsed/expanded and remembers the preference locally.

Primary groups are Content, Publishing, Media & Labs, Site and System.

## Dashboard stats

Drafts, scheduled publications, published records, media count and registered assets.

## Workflow panels

Recent Drafts, Scheduled Publications, Recently Published, Recent Edits, Pending Submissions, Recently Uploaded Media, Recent Revisions, Quick Create and Analytics Overview.

Revision history appears after server-backed saves. Media entries can signal missing alt text.

If first-run setup is incomplete, setup appears directly in the Newsroom.

---

# Posts, Status, Scheduling, Review, Autosave, and Revisions

Posts are normal editorial records.

## States

**Draft**: saved, non-public.

**Review / in_review**: editorial review state.

**Scheduled**: prepared for future publication.

**Published**: public.

**Archived**: retained but no longer ordinary current content.

**Trash**: removed from ordinary editorial use.

## Actions

**Save Draft** persists draft state.

**Submit for Review** keeps the item non-public and moves workflow to review.

**Preview** saves changes then opens preview.

**Schedule** sets scheduled state.

**Publish** sets publication/workflow to Published.

**Trash** moves an existing item to Trash.

## Autosave

The native editor debounces autosaves to D1. It shows saving, saved-time and failure messages.

If autosave fails, do not reload casually. Use explicit Save Draft and diagnose repeated failures.

## Revisions

Server revision history supports compare and restore.

A restored D1 revision is persisted.

A legacy browser recovery snapshot is only loaded into the editor until Save Draft/Publish succeeds.

## Status versus workflow

They are related but separate fields. The UI aligns them for ordinary actions, but imported/custom records can expose differences.

---

# Complete Native Editor Reference

The native editor is the central post/episode editing surface.

## Main fields

**Title**: public/editorial title.

**Slug/permalink**: URL-safe identifier. Changing a circulated slug can break inbound links.

**Excerpt/summary**: condensed copy for cards/listings/feeds depending on context.

**Body**: main content.

## Visual/source editing

The editor can expose Visual and source/text-style editing. Switching modes does not publish.

## Formatting

Use semantic paragraphs, headings, emphasis, links, lists and quotations. Headings should describe structure, not merely look big.

## Pasting

After rich-text paste, inspect headings, lists, links and unexpected styling, then preview.

## Featured image

The editor stores featured/hero imagery and can carry title, alt, caption and title-display treatment.

## Title display

Supported values include overlay, below and hidden.

## Categories

Tabs include **All** and **Most Used**. Check categories to attach them. Current native compatibility mirrors category/project data where necessary.

## Tags, collections and campaigns

Attach reusable tags, collection membership and campaign relationships as appropriate.

## Author

Sets the item author/byline value. Treat it as potentially public.

## Comments

Stores whether comments are allowed; public behavior depends on the comment implementation.

## Display settings

Native records can support Read mode, Experience mode, Print mode, default mode and hero style.

## Podcast fields

Podcast entries can contain audio source/enclosure URLs, duration, episode, season, transcript, summary, cover, MIME/size, explicit, credits, license, markers and delivery status.

## Scheduling

Scheduled state exposes scheduling controls. Verify intended timezone/instant.

## Revisions

Compare/restore historical snapshots. Legacy recovery must be explicitly saved to persist.

## Publishing actions

Save Draft, Submit for Review, Preview, Schedule, Publish and Trash are described in the workflow chapter.

---

# Pages and Live Site Editing

Pages are public site surfaces rather than ordinary chronological posts.

The Pages list identifies public surfaces with Title, Slug, Type and Path, and can include a representative post-template entry.

**View** opens the public page.

**Edit live** opens the public surface in live editing mode.

Use the post editor for article/content records. Use live editing for public-site configuration and page-level presentation controls.

Site/public configuration can maintain draft changes until explicitly saved/published. Verify the live site after publishing configuration.

---

# Media Library

The Media Library is the central asset inventory.

## Accepted upload classes

Images, audio, MP4/WebM video, PDF, ZIP, EPUB, Word, OpenDocument text, RTF, plain text, Markdown and CSV.

## Upload

Select files or drag/drop. The panel reports upload progress, successful registration and per-file failures.

## Runtime storage

Browser-local: browser media database.

Desktop: local publication media folder.

Server: configured site media/object storage plus registry/database metadata.

## Media record metadata

ID, URL/download URL, filename, title, alt text, caption, description, credit, attribution, creator, license, license URL, source URL, folder, tags, MIME type, extension, media type, source, storage key, size and timestamps.

## Previews

Images/SVG render as images. Audio/video can be playable. PDF/other types use file-type representations.

## Alt text

Describe meaningful information, not filenames.

## Rights metadata

Preserve creator, license, attribution and source when using external/open assets.

## Imported/native references

The library can discover media referenced by native/imported content and deduplicate against registered assets.

## Legacy browser recovery

Old browser-cache-only media can appear in recovery. Existing server URLs can sometimes be re-registered. Data URLs may require the original file.

Before deleting/replacing media, check where it is used.

---

# Collections

Collections present curated bodies of work without replacing posts.

## Collection details

Title, unique Slug, Status (Published/Draft/Archived), Subtitle, Overview, Featured quote, Cover image, Choose Cover and Cover alt text.

## Assigned pieces

Search available content and check pieces to include them.

The ordered list provides **Up**, **Down** and **Feature**.

**View Collection** opens the public collection route.

## Relationships

Related collections and related piece slugs.

## Structured sections

Timeline: date/title/body.

Downloads: title/URL/type.

Gallery: title/URL/alt/caption.

Updates: date/title/body/URL.

External Links: title/URL.

Rows support Add, Up, Down and Remove.

**Save Collection** persists.

**Reload** reloads backing data and can replace unsaved local changes.

Deleting a collection does not automatically delete its posts.

---

# Taxonomy

Taxonomy stores reusable terms.

Current types are Tag, Series, Theme and Project.

## Term form

**Label**: required human name.

**Slug**: identifier.

**Taxonomy**: choose type.

**Description**: optional editorial context.

**Add term / Update term** persists.

**Clear** resets the form.

## List controls

**Type** filters All/Tags/Series/Themes/Projects.

**Search** matches label, slug and description.

**Refresh** reloads terms.

**Edit** loads a term.

**Delete** removes a term record. Check whether published content still refers to it.

---

# Publications and Reader/Print Editions

Publications assemble editorial pieces into books, magazines, zines, readers, pamphlets, poster packs, campaign kits, booklets and similar packages.

## Workflow

Create Publication → Select pieces → Select cover → Arrange order → Generate publication.

## Details

Title, Slug, Type, Visibility, Issue number, Edition and Description.

Visibility normalizes into published/archived/draft status when saved.

## Cover and matter

Cover image, Choose Cover, Front matter, Credits, Colophon and Back cover.

## Pieces

Search the archive, check pieces, and order them Up/Down.

## Downloads/editions

Add download rows with title, URL and type. Remove unwanted rows.

## PrintLab project URL

Links the publication to PrintLab.

## Actions

**Save** persists the definition.

**Generate Publication** builds publication pages and creates version history.

**Open in PrintLab** opens layout production.

**Download Page** opens the public publication/download landing.

**Reader Edition** opens the reader route.

Generated versions record label, summary and page count.

---

# Campaigns

Campaigns are modular public hubs for ongoing work.

## Top actions

Add New Campaign, Duplicate, Archive, Delete, View Campaign, Save + Preview, Save/Create Campaign.

Unsaved-change protection warns before abandoning a dirty campaign.

Archive removes the campaign from normal public directory behavior. Delete permanently removes the campaign and revision history.

## Identity/lifecycle

Campaign title, short title, slug, publication visibility and lifecycle state are separate concepts.

Manual slug editing locks automatic slug generation.

## Deadline

Campaign deadline uses wall-clock time plus explicit timezone and validation.

## Sections

Sections can be ordered and hidden/shown.

## Structured list editors

Campaign Updates: date/time, title, body, URL, pinned, moderation.

Letters + Reporting Resources: type, title, description, URL/path/file, button label, image, moderation.

Social Feed: platform, date, account/author, language, excerpt, original URL, image, moderation.

Campaign Graphics: title, image, alt, caption, download URL, moderation.

Manual Press + Coverage: date, outlet, language, original title, English title, URL, summary, moderation.

Signatories: name/organization, location, website, statement, moderation.

Primary Sources: title, publisher/source, URL, why it matters.

Campaign Timeline: date, title, description.

FAQ: question, answer.

Translations: language, title, URL.

Moderation values include automatic, featured and hidden.

## Revisions

Campaign revisions can be restored. The UI confirms when restore would replace unsaved changes.

---

# Investigations and Public Records Desk

Investigations are living evidence/reporting hubs.

## Identity + status

Title, Slug, Public visibility, Investigation status, Deck, Hero image URL and Hero alt text.

Title/slug are required to save. Public visibility and investigation lifecycle/status are separate.

## Reader orientation

Explainer, How to use this page, One-minute summary, Main question, Why it matters/stakes, and Decision tree/reporting map.

## Sources + receipts

Each source can store title, type, publisher/agency/account, evidence state, original URL, archive URL, document/media URL, excerpt and notes/why it matters.

## Timeline

Date, evidence state, title, description and related claim.

## Public Records Desk

Requests can store request title/status/type/law, law name, agency, jurisdiction, subdivision/component, public title, why it matters, records sought, request text, public flags, date range, preferred format, fee waiver language, expedited-processing language, request method and related response/document metadata.

An optional federal agency lookup can be enabled, but the records desk itself is jurisdiction-neutral.

Unsaved-change protection warns before leaving a dirty investigation.

---

# Courses and Learner Progress

Courses provide structured self-paced learning.

## Reader

Shows title/summary, completion count/percent, lesson navigation, locked/unlocked lessons, activities, private notes, bookmarks, completion controls and Previous/Next.

## Local-first progress

Progress can include completed lessons/activities, last lesson, notes and bookmarks. It stays local unless exported.

**Export progress** downloads JSON.

**Import progress** loads compatible JSON.

## Admin

**Add Course** creates a course draft.

Fields include Title, Slug, Summary, Description, Status, Authors, Contributors, Reviewers and editor-only Review notes.

Statuses: draft, review, published, archived.

## Sections

Title, Summary and Order. Add/remove sections.

## Lessons

Lesson ID, title, summary, HTML body, order, estimated minutes, difficulty and model-supported prerequisite fields.

## Activities

Type, title, prompt and required flag. Required activities can block lesson completion.

## Resources

Title, URL and note.

Save persists; delete removes the course.

---

# Podcast Episode Fields in the Editor

Podcast episodes are native content records with podcast metadata.

Fields can include audio source URL, RSS enclosure URL, duration, episode number, season, podcast summary, transcript, cover image, MIME/file metadata, explicit flag, credits, license, markers/chapters and delivery state.

AudioLab can populate many of these automatically.

The RSS enclosure must point to publicly reachable stable audio. A local browser/desktop URL is not a publishable podcast enclosure.

---

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

---

# Podcast Hosting and Migration Checklist

Before migration record the old feed URL, show identity/artwork, category/language/explicit state, owner metadata, episode count, oldest/newest episodes, GUID stability, audio URL behavior and old-host redirect support.

Then:

1. Add Podcast.
2. Preview old/current RSS.
3. Import channel settings if desired.
4. Import episodes in batches.
5. Compare counts.
6. Spot-check old and new episodes.
7. Verify canonical Colophon RSS.
8. Verify enclosure playback publicly.
9. Configure old-feed redirect where supported.
10. Update podcast directories as needed.
11. Monitor the transition.

Check title, date, duration, enclosure, audio playback, episode/season, summary, artwork and transcript on sampled episodes.

Historical analytics from the old host remain a separate dataset unless explicitly reconciled.

---

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

---

# Translations

Colophon keeps publication authority even when Weblate is the collaboration workspace.

## Source selection/actions

Choose content, Open Article, Open Weblate.

**Download current English source** exports source JSON after source changes.

## Import fields

Language code, Language label, Translator credit, Reviewer credit and Weblate component URL.

**Import translated JSON** imports into `in_review`, not immediately public.

## External translations

Register language code, label, original Translation URL and Credit.

This preserves the translator's original hosting rather than republishing the text without need.

## Records

Language, Provider, Status, Credit, Destination and Actions.

States: draft, in_review, approved, published, archived.

Only Published native translations become public language variants.

Delete removes the translation record.

A backend translation record existing is not the same as a public translation existing.

---

# Editorial QA and Release Verification

Use Editorial QA for publication-quality checks exposed by Articles.

Site Health additionally reports missing featured images, missing alt text, possible orphaned media and link references needing review.

The manual QA screen includes route/auth/session/keyboard/print/public-edit/write-protection checks.

Before a release, create the canonical System Backup rather than a partial ad-hoc export.

---

# PrintLab

PrintLab is an integrated print-production workspace.

## Sources

Asset Browser, Upload Image, URL Import and CMS Post.

External/open assets can have different licensing requirements. Preserve attribution and verify rights.

## Tools

**Tile Sheet**: rows, columns, gap, fit, caption.

**Poster Split**: horizontal/vertical sheet counts, fit, page numbers.

**Page Layout**: orientation, title, body, image position, footer.

**Half-Fold Zine**: title, body, footer, include image, margins, sheet navigation.

**Canvas**: freeform blocks, text, image/crop, position/size, typography, background, zoom and history.

## Common controls

Fit: cover, contain, stretch.

Orientation: portrait, landscape.

Image position: top, side, background.

Margins: Tight, Normal, Wide, Custom.

## Publication/page model

PrintLab maintains a publication/pages model with page creation, duplication, deletion, active page selection and mode-specific output.

Canvas keeps bounded undo/redo history.

## Fonts

PrintLab supports system/configured fonts and upload of TTF, OTF, WOFF, WOFF2.

The current PrintLab implementation can also load Google Fonts. Privacy/offline-sensitive operators should prefer system/self-hosted fonts and verify runtime behavior.

## Smart image tools

Background removal/image segmentation exists when the segmentation service/runtime is configured.

## Export

Inspect final print/PDF output for margins, page breaks, crop, imposition, image resolution, attribution and fonts.

Publications assembles the editorial package; PrintLab is the layout/production workspace.

---

# AudioLab

AudioLab is the integrated audio-production workspace.

## Projects

Project cards show title, track/source counts, render/public state and last update. **New** creates a project.

## Sources and recording

Import source audio or record with microphone permission in runtimes supporting MediaRecorder/getUserMedia.

Sources remain preserved and can be added to tracks.

## Waveform/transport

Decoded audio renders as a waveform with playhead, seek and selection.

## Tracks/clips

Operations include placement, trim/selection, split, move between tracks and delete. Source audio remains preserved.

## Effects

Add effect, add preset, toggle, update parameters, reorder and delete.

## Transcript

Modes: Plain text and Timestamped cues.

Import TXT/SRT/VTT. SRT/VTT parse into cues.

Export text or WebVTT.

## Markers

Add at playhead; edit time/title/note; delete.

Markers can become chapter metadata.

## Episode metadata

Title, slug, description, episode/season, cover, explicit, credits, license and related fields.

## Rendering/delivery

Render final episode, download render, upload master, create delivery audio, upload delivery, copy/open public URL and run delivery/readiness checks.

A local-only render is not RSS-ready.

## Create episode draft

Hands the AudioLab project into native podcast content with public audio/enclosure, duration, summary, transcript, episode/season, cover, MIME/size, explicit, credits/license, markers, transcript cues, storage IDs, master/delivery URLs and delivery status.

AudioLab is built around preserved source blobs and a non-destructive project model.

---

# Settings and Public Site Configuration

Settings is normal publication configuration; infrastructure diagnostics belong in Site Health.

## Publishing tools

Enable/disable modules. Hiding a module does not inherently delete its historical data.

## Public identity

Publication name, Short name, Site URL, Logo URL, Editor/correspondence label, Default social identity, Contact email, Footer identity and Footer text.

These values can affect masthead, footer, metadata, feeds and publication-facing UI.

## Navigation

Each item has Show, Label, Destination, Up, Down and Remove.

**Add navigation link** creates a custom item.

Module-linked navigation stays hidden when its module is disabled.

The interface previews the visible resolved menu.

## Typography

Roles: Display/publication title, Headings, Body/article text, Navigation/interface.

Choose fonts independently.

System/bundled choices avoid third-party font requests.

## Self-hosted font

Display name, Font family name, Style, Weight and WOFF/WOFF2 file.

**Add font to draft** uploads it into the unpublished configuration.

**Remove** removes the font and resets affected roles to system defaults.

Preview reflects unsaved draft configuration. Draft changes are not live until saved/published.

## Shortcuts

Feeds/RSS, Podcasts, Backups, Domain setup, Advanced/Site Health and Help.

---

# Domain Setup

A domain is the public address, not hosting.

## Connect a domain

Site name, Hostname, Status and optional Notes.

Enter a hostname such as `news.example.org`, not a full URL.

**Show DNS instructions** asks the deployment adapter for the host's expected DNS record.

**Save hostname** stores the record.

## DNS instructions

Shows provider, Type, Name and Value. **Copy value** copies the target.

If no DNS target is configured, the deployment/host must provide one first.

After DNS, verify the domain/HTTPS with the host.

## Saved domains

Site, Hostname, Status, Notes and Actions.

Actions: Save, DNS, Delete.

Deleting the Colophon record does not automatically remove DNS at an external provider.

---

# Users, Roles, Accounts, and Access

Accounts are a shared/server feature. Local Browser/PWA and Desktop do not require normal hosted accounts.

## Roles

Owner: full control including owners/account security.

Admin: site operations and non-owner accounts.

Editor: create/edit/publish/manage media, without account/site settings.

Viewer: read-only admin and analytics.

## Create account

Email, Display name, Initial password (minimum 12 characters), Role, Create account.

Accounts are provisioned directly; Colophon does not pretend invitation email was sent without a mail service.

## Accounts table

User, Role, Status, New password, Last login, Actions.

Save persists edits.

Delete removes the account after confirmation but does not delete authored content.

## Protections

Non-owner admins cannot modify protected Owners. Final active Owner is protected. Current account cannot ordinarily delete itself.

## Bootstrap session

Emergency admin token can create a bootstrap Owner path. Use it for recovery/provisioning, then use individual accounts. Do not share it as a team password.

## Capability examples

`content:write`, `media:write`, `publishing:write`, `site:manage`, `analytics:view`, `system:view`, `users:manage`.

Authorization must be enforced server-side, not only hidden in the UI.

---

# Analytics

Server analytics support 7, 30 and 90 day reports plus Refresh.

Metrics include Views Today, Sessions Today, period views/sessions, Views per Session and Active in the last 30 minutes.

Traffic over time graphs views/sessions.

Top Content consolidates legacy/alternate/print URLs into canonical paths.

Breakdowns can include External Referrers, Campaign Entries, Traffic Sources, Devices, Browsers and Countries.

Countries are displayed only after a privacy threshold.

A session is a browser-tab session using a daily rotating hash, not a claim of unique people.

Current methodology reports first-party events; excludes bots, admin/API, DNT and GPC; and says it never stores cookies, raw IP addresses or fingerprints.

The UI currently states daily/Today totals use Pacific Time.

Browser-local mode disables normal server analytics calls.

---

# Site Health

Site Health combines infrastructure diagnostics with editorial checks.

Summary: Database readiness/record count, missing schema tables, media storage readiness and content-QA references.

Production bindings include BF_DB, ASSETS, media/R2, session secret, admin token, host and diagnostic generation time.

D1 schema/counts lists expected tables.

Editorial checks report searchable/feed-ready records, media count, missing featured images, missing alt text and possible orphaned media.

Link Reference Review classifies stored URLs; it does not claim external URLs were fetched successfully.

Use Site Health for deployment, database, storage, schema, auth and broad content-health problems.

---

# Audit Log

Audit Log is server operational history.

Search can match action, entity type, entity ID, actor and event detail.

Events show action, entity type/ID, actor, time and JSON detail.

Use it to understand who/what changed operational state. It is not a substitute for backups or revision history.

---

# Backups, `.colophon` Portability, Export, and Restore

Backups are normal operations.

## Portable `.colophon`

Can include setup, public config, native content, collections, publication projects, podcast settings, campaign data, translations, feed settings, media metadata/local media and format/schema metadata depending on export mode.

## Desktop automatic backups

Automatic backups can be On/Off, Daily/Weekly, retaining 3/7/14/30 copies.

Actions: Back up now, Open backup folder, Backup help.

Same-computer backups do not protect against disk loss. Export elsewhere too.

## Verified server export

Current snapshot coverage includes native content/revisions, taxonomy, safe user identity/role metadata, audit events, media metadata, collections, campaigns/revisions/coverage, investigations/revisions, publications, sites/domains, feed settings, podcast settings and public config.

Password hashes/salts are excluded.

Server snapshot media is metadata/public URLs, not necessarily duplicate binary objects.

If required datasets/manifest are incomplete, export refuses to download rather than producing a reassuringly useless backup.

## Restore

Before import: make a fresh backup, verify compatibility, understand merge/replace behavior, verify media/feeds/podcast GUIDs, and inspect public routes after.

A backup never restore-tested is a hypothesis.

---

# Browser / PWA Operator Guide

Browser/PWA is local-first. Records/media live under the browser profile/site origin. No hosted account is required.

Supported browsers can install the PWA without creating a second cloud copy.

The application shell can work offline after load; external integrations still need the network.

Browser quotas vary. Heavy audio/video/lab work is better in Desktop.

Use Back up / Publish Online → Export complete backup for `.colophon`.

To move to Desktop: export, import, verify.

To put it online: export, provision a compatible server, import, verify host URL, then connect custom domain if wanted.

Opening local Colophon does not automatically upload the publication.

---

# Install and Self-host

The repository's technical INSTALL document remains the exact deployment authority.

Current supported production shape: Vite frontend, Pages/Workers-style Functions, D1 as `BF_DB`, persistent R2-compatible media storage as `colophon_MEDIA_BUCKET`.

Required secrets currently include `colophon_ADMIN_TOKEN` and `colophon_SESSION_SECRET`.

## First deployment

Deploy → `/login` → Newsroom → first-run setup → create real Owner account → verify upload → draft/publish test → verify public route → create backup → optionally connect domain.

## Domain model

Domain + DNS + hosting + Colophon are separate pieces.

Colophon's deployment adapter reports the DNS record expected by the current host.

## Other hosts

Do not advertise one-command Docker/VPS support until a maintained recipe covers frontend, API runtime, SQL, media storage, secrets, jobs, backups, routing, HTTPS and upgrades.

## Optional integrations

Campaign signature provider settings, podcast refresh/distribution tokens/adapters and FOIA.gov editor lookup can be configured as needed.

Before editor handoff, test login, Owner, Editor, DB/schema, object storage/upload, public routes, feeds, backup and domain/HTTPS.

---

# Desktop Operator Guide

Desktop runs Colophon as an installable app using local SQLite, local media and a localhost-only internal server.

No hosted account/domain is required.

The Desktop menu exposes the publication data folder.

Publication data lives outside the installed application bundle, so normal upgrades should not erase it. Backups are still mandatory.

Desktop currently targets Windows installer, macOS DMG/ZIP, Linux AppImage and Debian package builds.

Publish Online lets a local-first publication move toward a hosted/public server instead of becoming a local silo.

---

# Migration and Import

## Browser to Desktop

Export `.colophon`, import in Desktop, verify, preserve original backup.

## Local to server

Export, provision server, verify health, import, verify media/public routes/feeds/podcasts, connect domain.

## WordPress

The repository includes a WordPress import script.

After import audit slugs, dates, bylines, categories/tags, images, alt text, internal links, attachments, redirects and feeds. Do not assume old rich HTML maps perfectly.

## Podcast host migration

Use the podcast migration checklist.

## Feed cleanup

Use feed aliases/hidden terms for undesirable imported taxonomy lanes.

## Legacy browser data

Recovered media/revisions must be explicitly persisted before treating them as server-backed.

---

# Security and Privacy for Operators

Use individual accounts on shared installs and do not share the bootstrap token.

Use unique strong passwords. Current UI requires 12+ characters.

Grant the lowest role that supports the job.

Keep server secrets out of the repository.

Protect backups; they can contain sensitive publication/operational metadata.

Treat public bylines as public labels. Do not expose legal/private identity by accident.

Current analytics methodology avoids cookies/raw IPs/fingerprints and respects DNT/GPC.

Browser-local mode does not automatically upload publication data.

External services such as Weblate, open-media providers, podcast directories and current PrintLab Google Font loading have their own privacy implications.

Review media metadata before publication.

Back up before destructive import/delete/restore/domain/feed operations.

---

# Accessibility for Editors and Administrators

Use meaningful image alt text, semantic headings and descriptive link text.

Provide audio transcripts and video captions where practical.

AudioLab supports plain/timestamped transcripts.

Prefer tagged/searchable PDFs and HTML equivalents for essential information.

Keep admin/public workflows keyboard accessible with visible focus.

Do not communicate meaning only by color. Respect reduced motion.

For important releases test keyboard, zoom, narrow viewport, headings, links, alt text, focus, screen reader and print output.

---

# Public Site Surfaces and Routes

Current public route families include:

- `/post/:slug`
- `/archive`
- `/collections`
- `/collections/:slug`
- `/campaigns`
- `/campaigns/:slug`
- `/investigations`
- `/investigations/:slug`
- `/courses`
- `/courses/:slug`
- `/feeds`
- `/gallery`
- `/project/:slug`
- `/about`
- `/security`
- `/contact`
- `/support`
- `/submit`
- `/print/:slug`
- `/zine/:slug`

Legacy routes can redirect to canonical routes. Preserve redirects when changing URL design so old links do not rot for sport.

---

# Troubleshooting

## Missing menu item
Check module, runtime and permission.

## Published post not where expected
Check status, display/homepage settings, collection, taxonomy, feed rules and direct URL.

## Autosave failed
Do not reload. Try Save Draft and diagnose repeated failures via Site Health/connectivity.

## Legacy recovery loaded
It is not server-persisted until explicit Save/Publish.

## Media upload/404
Check file type, notices, storage binding/quota, registry, object existence, public URL and Site Health.

## Missing alt
Fix media/content metadata; Site Health can find candidates.

## Public page has no obvious post
Use Pages → Edit live.

## Domain failure
Check Colophon record, DNS, host verification and HTTPS.

## Podcast absent from show feed
Check publish state, show assignment, enclosure, manifest and show-specific RSS.

## Podcast appears in generic feed but not apps
Generic format RSS is not the show feed.

## Directory still uses old host
Use redirects and directory-side update tools.

## Ugly imported feed terms
Use aliases/hidden terms.

## Translation not public
Check status; imports begin in review.

## Course progress missing
Restore exported progress JSON if available.

## Browser publication missing
Restore from `.colophon`; browser/site data may have been cleared.

## Analytics missing
Server feature/permission/config.

## Weird Analytics day boundary
Current Today/daily reporting uses Pacific Time.

## Users/Audit missing
Server/runtime permission.

## PrintLab crop wrong
Check mode, fit, margins, crop, orientation and final print preview.

## AudioLab render not publishable
Upload a public master/delivery file. Local-only URLs are not RSS-ready.

## Transcript import wrong
Validate TXT/SRT/VTT.

## Campaign preview blocked
Allow pop-up, retry Save + Preview.

## Campaign deadline wrong
Check wall time and timezone.

## Investigation cannot save
Title and slug are required.

## Backup refuses export
Fix incomplete required datasets/backend rather than accepting a partial snapshot.

## Editorial or infrastructure?
Use editor/settings for editorial state and Site Health for DB/storage/deployment.

---

# Glossary

**Admin rail:** collapsible left administration navigation.

**Capability:** named permission authorizing an operation.

**Collection:** curated body of content with its own presentation.

**D1:** database backend in the current supported server architecture.

**Delivery audio:** public/distribution audio produced from an AudioLab project.

**Enclosure:** podcast RSS link to an episode audio file.

**Feed manifest:** inventory of live syndication endpoints/metadata.

**GUID:** stable podcast episode identifier.

**Local-first:** data/work primarily operates on the user's own device.

**Module:** optional major publishing subsystem.

**Native content:** Colophon's structured editorial record format.

**PWA:** Progressive Web App.

**Revision:** saved historical snapshot.

**R2-compatible media storage:** object storage used by the current supported server media architecture.

**RSS:** syndication XML.

**Site Health:** diagnostics for installation and content health.

**Slug:** URL-safe record identifier.

**Taxonomy:** structured reusable classification.

**Workflow state:** editorial state such as draft/review/scheduled/published.

**`.colophon`:** portable Colophon publication backup/package.

---

# Admin Route Reference

| Screen | Route |
|---|---|
| Newsroom | `/wp-admin` |
| Posts | `/wp-admin/posts` |
| Add New | `/wp-admin/add-new` |
| Native editor | `/wp-admin/native-bridge` |
| Translations | `/wp-admin/translations` |
| Media | `/wp-admin/media` |
| Pages | `/wp-admin/pages` |
| Projects | `/wp-admin/projects` |
| Collections | `/wp-admin/collections` |
| Campaigns | `/wp-admin/campaigns` |
| Investigations | `/wp-admin/investigations` |
| Courses | `/wp-admin/courses` |
| Publications | `/wp-admin/publications` |
| Feeds | `/wp-admin/feeds` |
| PrintLab | `/wp-admin/printlab` |
| AudioLab | `/wp-admin/audiolab` |
| Customize | `/wp-admin/customize` |
| Live Editor | `/wp-admin/live-editor` |
| Tools | `/wp-admin/tools` |
| Site Health | `/wp-admin/site-health` |
| Backups | `/wp-admin/system-backup` |
| Audit Log | `/wp-admin/audit-log` |
| Analytics | `/wp-admin/analytics` |
| Taxonomy | `/wp-admin/taxonomy` |
| Roles | `/wp-admin/roles` |
| Platform Map | `/wp-admin/platform-map` |
| QA | `/wp-admin/qa` |
| Settings | `/wp-admin/settings` |
| Users | `/wp-admin/users` |
| Domains | `/wp-admin/settings/domains` |
| Podcasts | `/wp-admin/podcasts` |
| Podcast Settings | `/wp-admin/podcasts/settings` |
| Overrides | `/wp-admin/overrides` |

Older short routes redirect into canonical admin routes. Documentation should link to canonical routes.

---

# Permissions and Module Visibility Matrix

## Modules

| Module | Primary surfaces |
|---|---|
| Articles | Posts, Add New, Pages, Collections, Taxonomy, Editorial QA |
| Podcasts | Podcasts, episode creation, podcast settings |
| Campaigns | Campaigns |
| Investigations | Investigations |
| Courses | Courses |
| Publications | Publications |
| Translations | Translations |
| PrintLab | PrintLab |
| AudioLab | AudioLab |

## Presets

| Preset | Modules |
|---|---|
| Simple Blog | Articles |
| Media Publication | Articles, Podcasts, Translations |
| Everything | All modules |
| Custom | Manual |

## Capability examples

`content:write`, `media:write`, `publishing:write`, `site:manage`, `analytics:view`, `system:view`, `users:manage`.

Exact role-capability mapping is application authorization logic. UI hiding must never be the sole security layer.

---

# Storage and Persistence Reference

| Runtime | Records | Media | Accounts | Backups |
|---|---|---|---|---|
| Browser/PWA | IndexedDB/browser-local DB | Browser-local blobs | No | `.colophon` export |
| Desktop | SQLite | Filesystem media | No | Automatic local + `.colophon` |
| Server | D1 in current supported architecture | R2-compatible object storage | Yes | Server snapshot + portable/full |

Treat the configured authoritative store as source of truth. Browser UI cache/preferences are not a second durable publication.

---

# Maintaining the Handbook

A user-facing feature is not fully documented until its workflow, controls, side effects, destructive behavior, visibility rules and predictable troubleshooting are covered.

For interface changes update the feature chapter, route reference if needed, permissions/modules if needed, `reference/UI-CONTROL-INVENTORY.csv`, reference CSVs and `COMPLETE-HANDBOOK.md`.

Every non-obvious control should answer: what it does, why to use it, what changes, and what else it affects.

Screenshots can supplement text under `docs/handbook/images/`, but text remains authoritative because screenshots age with the enthusiasm of milk.

At each release update version, source commit/tag, changed admin components and inventories.
