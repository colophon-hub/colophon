import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { detectMediaSignature, mediaMimeMatchesSignature, validateMediaBytes } from '../functions/api/_lib/mediaSignature.js'

const bytes = (...values) => new Uint8Array(values)

test('detects common binary media signatures', () => {
  assert.equal(detectMediaSignature(bytes(0xff, 0xd8, 0xff, 0x00)), 'image/jpeg')
  assert.equal(detectMediaSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png')
  assert.equal(detectMediaSignature(new TextEncoder().encode('%PDF-1.7\n')), 'application/pdf')
  assert.equal(detectMediaSignature(new TextEncoder().encode('fLaCmorebytes')), 'audio/flac')
})

test('rejects a claimed image whose bytes are executable', () => {
  const result = validateMediaBytes(bytes(0x4d, 0x5a, 0x90, 0x00), 'image/png')
  assert.equal(result.ok, false)
  assert.match(result.reason, /executable/i)
})

test('rejects MIME/signature mismatch', () => {
  const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
  const result = validateMediaBytes(png, 'image/jpeg')
  assert.equal(result.ok, false)
  assert.equal(result.detectedType, 'image/png')
})

test('accepts ZIP-family document containers and safe UTF-8 text', () => {
  const zip = bytes(0x50, 0x4b, 0x03, 0x04, 0x00)
  assert.equal(validateMediaBytes(zip, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').ok, true)
  assert.equal(validateMediaBytes(new TextEncoder().encode('# Notes\nplain text'), 'text/markdown').ok, true)
})

test('SVG validation rejects active content', () => {
  const safe = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>')
  const active = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
  assert.equal(validateMediaBytes(safe, 'image/svg+xml').ok, true)
  assert.equal(validateMediaBytes(active, 'image/svg+xml').ok, false)
})

test('compatible container signatures match declared media types', () => {
  assert.equal(mediaMimeMatchesSignature('video/mp4', 'application/mp4'), true)
  assert.equal(mediaMimeMatchesSignature('audio/ogg', 'application/ogg'), true)
  assert.equal(mediaMimeMatchesSignature('application/pdf', 'application/pdf'), true)
})

test('both persistent upload endpoints enforce signature validation and nosniff', () => {
  const mainUpload = fs.readFileSync(new URL('../functions/api/media/files.js', import.meta.url), 'utf8')
  const contributorUpload = fs.readFileSync(new URL('../functions/api/campaign-contributor-media.js', import.meta.url), 'utf8')
  assert.match(mainUpload, /validateMediaBytes/)
  assert.match(contributorUpload, /validateMediaBytes/)
  assert.match(mainUpload, /x-content-type-options/)
  assert.match(contributorUpload, /x-content-type-options/)
  assert.doesNotMatch(mainUpload, /mimeType\.startsWith\('text\/'\).*return true/)
})
