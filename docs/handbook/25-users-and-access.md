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
