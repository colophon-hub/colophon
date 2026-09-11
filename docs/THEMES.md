# Colophon themes

Colophon themes are declarative presentation packages. They can change the public look of a publication without rewriting publication content.

They are intentionally **not** executable WordPress-style themes. A theme package cannot upload server-side code or JavaScript plugins.

## Package format

A shareable theme is UTF-8 JSON, conventionally named:

`theme-id-version.colophon-theme.json`

Example:

```json
{
  "format": "colophon-theme",
  "formatVersion": 1,
  "id": "paper",
  "name": "Paper",
  "version": "1.0.0",
  "author": "Example designer",
  "description": "A quiet reading theme.",
  "colophon": ">=0.1.0",
  "css": ".piece-page{max-width:70rem}",
  "tokens": {
    "--reading-width": "44rem"
  },
  "layout": {
    "header": "compact",
    "footer": "columns",
    "article": "narrow",
    "archive": "list"
  },
  "assets": []
}
```

## Safe boundaries

Theme validation:

- requires a safe lowercase theme id and version;
- caps theme CSS size;
- rejects `@import`, `expression()`, `javascript:` and legacy executable CSS constructs;
- rejects literal imported CSS `url()` values;
- permits packaged asset references through `theme-asset("assets/path.ext")`;
- rejects traversal paths, absolute paths, duplicate asset paths, unsupported MIME types, oversized individual assets, and oversized packages;
- permits packaged image and WOFF/WOFF2 font assets in the initial format.

A packaged asset record looks like:

```json
{
  "path": "assets/headline.woff2",
  "mime": "font/woff2",
  "dataBase64": "..."
}
```

## Administration

The settings screen lists installed themes and identifies the active one. Site managers can:

- import a theme package;
- activate an installed theme;
- export a non-built-in theme;
- remove an inactive non-built-in theme.

The neutral built-in theme is always available and cannot be removed.

Switching themes changes presentation state only. It does not rewrite articles, media, campaigns, podcasts, feeds, translations, or other publication records.

## Compatibility

The documented theme manifest is the supported third-party boundary. Private React component names, undocumented internal CSS, and database implementation details are not theme APIs.
