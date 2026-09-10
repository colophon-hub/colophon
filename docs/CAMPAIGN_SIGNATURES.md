# Campaign signatures

Campaign signing is optional per campaign. Existing static signatory lists remain valid and can be imported into the verified-signature system without enabling public submissions.

## Lifecycle

A submission is accepted as either an individual or organization. Email verification uses a random token whose hash, not raw value, is stored. Verification consumes that token and creates a separate hashed management token. Verified signatures enter moderation and are not public until approved. Public lists and counts query approved rows only and never include email addresses, token hashes, internal moderation notes or abuse signals.

Editors can approve, reject, remove, bulk-moderate, resend verification, import legacy static signers and export CSV. A signer can use their private management link without an account to edit public-facing fields or withdraw the signature.

Replacement verification tokens are activated only after the replacement email succeeds, so a mail-delivery failure does not invalidate the previous link.

## Outbound email

Set `SIGNATURE_EMAIL_PROVIDER` to `resend` or `webhook`.

For Resend:

- `RESEND_API_KEY`
- `SIGNATURE_EMAIL_FROM`

For a generic webhook:

- `SIGNATURE_EMAIL_WEBHOOK_URL`
- `SIGNATURE_EMAIL_WEBHOOK_TOKEN` if the endpoint requires bearer authentication
- `SIGNATURE_EMAIL_FROM`

`SIGNATURE_RATE_SALT` is recommended on shared server installations. All provider secrets stay server-side.

The reference schema is `db/campaign_signatures.sql`; runtime setup is idempotent for existing installations.
