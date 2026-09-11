# Markdown authoring

Colophon keeps the visual editor as the default writing interface. Markdown is an optional source workflow for writers who prefer plain text or who already have Markdown material to migrate.

## Supported syntax

The built-in converter supports:

- headings;
- paragraphs;
- emphasis and strong text;
- links;
- blockquotes;
- ordered and unordered lists;
- inline code;
- fenced code blocks;
- horizontal rules;
- images using safe local, HTTP, or HTTPS URLs.

Fenced code blocks can name `html`, `css`, `javascript`, `typescript`, `json`, `bash`, `shell`, `python`, `markdown`, `yaml`, or `sql`. Unknown language identifiers fall back to plain text.

## Import, paste, and source mode

The native post editor provides a Markdown tab and can import `.md`, `.markdown`, or plain-text files. Markdown can also be pasted directly into that source editor.

Markdown is converted to escaped, safe HTML for public rendering. Raw HTML pasted into Markdown is rendered as text rather than executed, and unsafe URL schemes are rejected.

The visual editor remains the default. Existing HTML/WYSIWYG posts are not converted to Markdown automatically.

## Export and round-tripping

Markdown-authored posts can be exported as `.md`. When an existing rich HTML post is moved into Markdown mode, Colophon performs a best-effort conversion.

Markdown cannot represent every rich visual-editor construct. Unsupported rich markup is preserved visibly as an `html` fenced block where the browser converter can inspect it, instead of silently discarding the source. This is a migration aid, not a promise of pixel-perfect HTML ↔ Markdown round-tripping.

## Storage

Markdown is not the canonical storage format for every Colophon publication. Native content gains an additive `sourceFormat` field:

- `html` for the normal visual/HTML workflow;
- `markdown` for Markdown-source entries.

A Markdown entry keeps its source in `body` and stores the safe rendered result in `bodyHtml`. Existing content remains valid without migration.
