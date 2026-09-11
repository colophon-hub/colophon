# Source audit notes

These notes are for maintainers, not ordinary handbook readers.

**Target documentation release:** Colophon 0.1.6  
**Repository audited:** `colophon-hub/colophon`  
**Audit date:** 2026-09-10

## Version discrepancy observed during audit

The project owner identified the current release as **0.1.6**. The default-branch `package.json` fetched during this audit still reported `0.1.5`.

This handbook is labeled **0.1.6** as requested. Maintainers should make sure the repository package version and release/tag metadata are synchronized before the next formal release.

## Neutral-upstream cleanup observations

Some source files still contain publication-specific compatibility or migration helpers. Examples observed during the documentation audit include:

- a translation admin default tied to one specific Weblate component;
- hard-coded known external translations for one legacy article;
- a manual QA example containing a publication-specific project name.

Those behaviors are not presented as normal generic Colophon functionality in the handbook.

## Documentation confidence

The following areas were inspected directly in source and are documented at high confidence:

- publishing modules and presets;
- first-run identity fields;
- Newsroom/dashboard;
- routes and redirects;
- native article editor states/actions;
- Media Library behavior and accepted file classes;
- Collections;
- Taxonomy;
- Publications;
- Podcasts and podcast RSS import/resync;
- Feeds & Syndication;
- Translations;
- Courses;
- Campaigns;
- Investigations;
- Backups;
- Domains;
- Users & Access;
- Site Health;
- Analytics;
- Audit Log;
- PrintLab major work modes;
- AudioLab major work modes;
- Browser/PWA behavior;
- Desktop behavior;
- current server install architecture.

Areas that evolve particularly quickly, especially PrintLab, AudioLab, Campaigns, and the native editor, should be re-audited whenever their source changes materially.
