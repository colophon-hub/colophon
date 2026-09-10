# Platform upgrade notes

This upgrade adds optional Courses, verified campaign signatures, native podcast hosting/migration/distribution, Web Share Target intake, stronger upload validation, explicit public API projections, editor media-selection reliability and an expanded Public Records Desk.

## Existing installations

The new server tables are created idempotently by their APIs and have reference SQL in `db/`. Existing posts, media, campaigns, investigations, translations, podcast imports, feed identities and users are not reset.

Existing podcast shows remain in external-RSS mode until an editor deliberately starts native migration or switches the show to native hosting. Existing static campaign signatories remain unchanged until an editor enables verified signing or imports them. Courses are disabled unless the publication enables the Courses module.

## New optional server configuration

- `FOIA_GOV_API_KEY`: U.S. federal records-directory lookup
- `SIGNATURE_EMAIL_PROVIDER`, `SIGNATURE_EMAIL_FROM` and provider-specific email settings
- `SIGNATURE_RATE_SALT`: recommended signature anti-abuse salt
- `PODCAST_REFRESH_TOKEN`: scheduled external podcast refresh
- `EPISODE_WORKER_TOKEN`: scheduled external podcast distribution worker
- `PODCAST_DISTRIBUTION_YOUTUBE_URL` / `_TOKEN`: optional YouTube adapter
- `PODCAST_DISTRIBUTION_PEERTUBE_URL` / `_TOKEN`: optional PeerTube adapter

Native podcast hosting also requires the normal database and media/object-storage bindings.

## Privacy changes

Public native-content and public-records responses now explicitly remove editorial/private fields. Podcast download accounting is aggregate-only. Learner course progress remains local by default. Campaign signer email and control-token material remain private.
