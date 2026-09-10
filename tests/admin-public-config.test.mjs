import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const card = fs.readFileSync(new URL('../src/components/AdminPublicConfigCard.jsx', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../src/admin-public-config.css', import.meta.url), 'utf8')

test('customize panel reports authoritative runtime state and visible backend errors', () => {
  assert.match(card, /browser-local/)
  assert.match(card, /backendMode/)
  assert.match(card, /Configuration unavailable/)
  assert.match(card, /Configuration error/)
  assert.match(card, /loadError/)
  assert.match(card, /saveError/)
})

test('customize panel only publishes through the authoritative config API', () => {
  assert.doesNotMatch(card, /applyDraftLocally/)
  assert.doesNotMatch(card, /clearSavedConfig/)
  assert.match(card, /saveDraftToBackend/)
  assert.match(card, /Reload published config/)
  assert.match(card, /Publish site changes/)
  assert.match(card, /Discard draft/)
})

test('publication identity is editable from the canonical settings surface', () => {
  for (const field of ['publicationName', 'shortName', 'siteUrl', 'logoUrl', 'correspondenceLabel', 'socialIdentity', 'contactEmail', 'footerIdentity', 'footerText']) assert.match(card, new RegExp(field))
})

test('public typography is editable without a separate settings system', () => {
  for (const role of ['display', 'heading', 'body', 'navigation']) assert.match(card, new RegExp(role))
  assert.match(card, /PUBLIC_FONT_PRESETS/)
  assert.match(card, /Add a self-hosted font/)
  assert.match(card, /WOFF2 or WOFF/)
})

test('admin styling overrides old public black theme', () => {
  assert.match(css, /background:\s*#fff !important/)
  assert.match(css, /color:\s*#1d2327 !important/)
})
