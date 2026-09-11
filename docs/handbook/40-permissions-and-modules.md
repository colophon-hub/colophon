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
