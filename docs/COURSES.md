# Courses

Courses are an optional publishing module for self-paced learning. Course content belongs to the installation and is not seeded with a curriculum.

Enable **Courses** in the publishing-module settings. Editors then get `/wp-admin/courses`; published courses appear at `/courses` and `/courses/:slug`.

## Model

A course contains ordered sections, lessons and activities. Lessons can declare prerequisite lesson IDs and use either manual completion or required-activity completion. Course records support `draft`, `review`, `published` and `archived` states. Publishing writes a separate versioned public snapshot, so later editorial edits do not silently change the live course until it is published again. Contributor, reviewer and review-note fields remain editorial-only.

Server installations create the `courses`, `course_publications` and `course_revisions` tables idempotently. `db/courses.sql` is the reference schema.

## Learner privacy and portability

Learner completion state, bookmarks, notes and the last-opened lesson are stored locally in the learner's browser. No learner account, email address or central progress profile is required. The reader can export progress as versioned JSON and import it on another device; imports are validated against the destination course and unknown lesson IDs are discarded.

Local/browser installations store course content in their normal local publication database. Server installations use the normal authenticated course API for editing and a published-snapshot API for public reading.

## Accessibility

The reader uses normal headings and landmark navigation, keyboard-operable lesson controls, explicit disabled prerequisite states and text labels in addition to completion marks. Colophon's global reduced-motion and focus rules apply to course pages.
