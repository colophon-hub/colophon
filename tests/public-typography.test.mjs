import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  buildCustomFontFaceCss,
  fontStackForRole,
  normalizeAppearance,
  normalizeCustomFont,
} from '../shared/publicTypographyModel.js'
import { mergePublicConfig, normalizePublicConfig } from '../src/lib/publicConfigSchema.js'

test('fresh public config uses neutral typography while legacy saved config keeps the old effective fonts', () => {
  const fresh = normalizePublicConfig({})
  assert.equal(fresh.appearance.typography.display.fontId, 'system-sans')
  assert.equal(fresh.appearance.typography.heading.fontId, 'system-sans')
  assert.equal(fresh.appearance.typography.body.fontId, 'system-serif')
  assert.equal(fresh.appearance.typography.navigation.fontId, 'system-sans')

  const legacy = normalizePublicConfig({ version: 3, text: {}, styles: {}, blocks: {} })
  assert.equal(legacy.appearance.typography.display.fontId, 'stamp')
  assert.equal(legacy.appearance.typography.heading.fontId, 'griffos')
  assert.equal(legacy.appearance.typography.body.fontId, 'vanilla-extract')
  assert.equal(legacy.appearance.typography.navigation.fontId, 'stamp')
})

test('custom self-hosted fonts accept WOFF2 and resolve through a safe structured stack', () => {
  const font = normalizeCustomFont({
    id: 'headline-local',
    displayName: 'Headline Local',
    familyName: 'Headline Local',
    url: '/api/media/files?key=media/uploads/fonts/example.woff2',
    format: 'woff2',
    style: 'normal',
    weight: 700,
  })
  assert.ok(font)
  const appearance = normalizeAppearance({
    customFonts: [font],
    typography: { display: { fontId: 'custom:headline-local' } },
  })
  assert.match(fontStackForRole(appearance, 'display'), /^"Headline Local"/)
  assert.match(buildCustomFontFaceCss(appearance), /format\("woff2"\)/)
  assert.match(buildCustomFontFaceCss(appearance), /font-weight:700/)
})

test('font settings reject CSS injection and unsafe asset URLs', () => {
  assert.equal(normalizeCustomFont({
    id: 'bad-font', displayName: 'Bad', familyName: 'Bad";color:red', url: '/bad.woff2', format: 'woff2',
  }), null)
  assert.equal(normalizeCustomFont({
    id: 'bad-font', displayName: 'Bad', familyName: 'Safe Font', url: 'javascript:alert(1)', format: 'woff2',
  }), null)
  assert.equal(normalizeCustomFont({
    id: 'bad-font', displayName: 'Bad', familyName: 'Safe Font', url: '/fonts/../secret.woff2', format: 'woff2',
  }), null)
})

test('publication identity renames cleanly without changing product identity', () => {
  const initial = normalizePublicConfig({ identity: { publicationName: 'TEST' } })
  assert.equal(initial.identity.publicationName, 'TEST')
  const renamed = mergePublicConfig(initial, { identity: { publicationName: 'ANOTHER PUBLICATION' } })
  assert.equal(renamed.identity.publicationName, 'ANOTHER PUBLICATION')

  const topbar = fs.readFileSync(new URL('../src/components/PublicationTopbar.jsx', import.meta.url), 'utf8')
  const footer = fs.readFileSync(new URL('../src/components/PublicationFooter.jsx', import.meta.url), 'utf8')
  const admin = fs.readFileSync(new URL('../src/components/AdminRail.jsx', import.meta.url), 'utf8')
  assert.match(topbar, /identity\.publicationName/)
  assert.match(footer, /identity\.publicationName/)
  assert.match(admin, /publicationIdentity\.publicationName/)
  assert.match(footer, /Powered by Colophon/)
  assert.match(admin, /aria-label="Colophon admin bar"/)
})

test('hosted media endpoint accepts self-hosted WOFF and WOFF2 assets', () => {
  const media = fs.readFileSync(new URL('../functions/api/media/files.js', import.meta.url), 'utf8')
  assert.match(media, /'font\/woff'/)
  assert.match(media, /'font\/woff2'/)
  assert.match(media, /type\.startsWith\('font\/'\)/)
  assert.match(media, /return 'Fonts'/)
})
