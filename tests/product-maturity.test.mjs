import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

import { normalizeUiAppearance, resolveUiAppearance } from '../shared/productAppearance.js'
import { markdownToSafeHtml, markdownExportFilename } from '../shared/markdownSupport.js'
import { highlightCode, normalizeCodeLanguage } from '../shared/codeHighlight.js'
import {
  activateTheme,
  installTheme,
  normalizeThemeManifest,
  normalizeThemeState,
  removeTheme,
} from '../shared/themeFormat.js'
import {
  applyExtensionFilters,
  createExtensionApi,
  emitExtensionEvent,
  getExtensionErrors,
  resetExtensionRegistryForTests,
} from '../shared/extensionHooks.js'
import { generateTotpCode, verifyTotpCode } from '../functions/api/_lib/accountSecurity.js'
import { derEcdsaToRaw } from '../functions/api/_lib/webauthn.js'
import {
  assertSafeRemoteUrl,
  htmlLinksToTarget,
  normalizeWebmentionUrl,
} from '../functions/api/_lib/webmentions.js'
import { extractOutboundLinks } from '../functions/api/_lib/webmentionSend.js'
import {
  normalizePublicConfig,
  PUBLIC_CONFIG_SCHEMA_VERSION,
} from '../src/lib/publicConfigSchema.js'

test('appearance supports System, Light, and Dark without inventing other modes', () => {
  assert.equal(normalizeUiAppearance('DARK'), 'dark')
  assert.equal(normalizeUiAppearance('nope'), 'system')
  assert.equal(resolveUiAppearance('system', true), 'dark')
  assert.equal(resolveUiAppearance('system', false), 'light')
  assert.equal(resolveUiAppearance('light', true), 'light')
})

test('Markdown renders supported authoring forms and escapes raw HTML', () => {
  const html = markdownToSafeHtml(`# Heading

A **strong** and *soft* [link](https://example.org) with \`inline()\`.

> Quote

- one
- two

1. first
2. second

---

\`\`\`python
print("<safe>")
\`\`\`

![alt](https://example.org/image.png)

<script>alert(1)</script>

[x](javascript:alert(1))`)

  assert.match(html, /<h1>Heading<\/h1>/)
  assert.match(html, /<strong>strong<\/strong>/)
  assert.match(html, /<em>soft<\/em>/)
  assert.match(html, /<blockquote>/)
  assert.match(html, /<ul>/)
  assert.match(html, /<ol>/)
  assert.match(html, /<hr \/>/)
  assert.match(html, /data-language="python"/)
  assert.match(html, /&lt;safe&gt;/)
  assert.match(html, /<img /)
  assert.doesNotMatch(html, /<script/i)
  assert.doesNotMatch(html, /href="javascript:/i)
  assert.match(html, /&lt;script&gt;/)
  assert.equal(markdownExportFilename('Hello, world!'), 'hello-world.md')
  const ampersand = markdownToSafeHtml('[A & B](https://example.org/?a=1&b=2)')
  assert.match(ampersand, />A &amp; B<\/a>/)
  assert.match(ampersand, /a=1&amp;b=2/)
})

test('syntax highlighting recognizes only the intentionally small language set', () => {
  assert.equal(normalizeCodeLanguage('js'), 'javascript')
  assert.equal(normalizeCodeLanguage('ts'), 'typescript')
  assert.equal(normalizeCodeLanguage('brainfuck'), 'text')
  const html = highlightCode('const answer = 42 // comment', 'javascript')
  assert.match(html, /tok-keyword/)
  assert.match(html, /tok-number/)
  assert.match(html, /tok-comment/)
})

test('theme manifests are declarative and reject unsafe CSS and traversal paths', () => {
  const valid = normalizeThemeManifest({
    id: 'paper',
    name: 'Paper',
    version: '1.0.0',
    css: '.piece-page{max-width:70rem}',
    tokens: { '--paper-gap': '1rem' },
    assets: [],
  })
  assert.equal(valid.id, 'paper')

  assert.throws(() => normalizeThemeManifest({
    id: 'bad',
    name: 'Bad',
    version: '1.0.0',
    css: '@import "https://evil.example/x.css";',
  }), /@import/)

  assert.throws(() => normalizeThemeManifest({
    id: 'bad-assets',
    name: 'Bad assets',
    version: '1.0.0',
    assets: [{ path: 'assets/../escape.woff2', mime: 'font/woff2', dataBase64: 'AA==' }],
  }), /unsafe theme asset path/)
})

test('theme switching preserves the neutral fallback and blocks removal of the active theme', () => {
  let state = normalizeThemeState({})
  state = installTheme(state, { id: 'paper', name: 'Paper', version: '1.0.0', css: '', assets: [] })
  state = activateTheme(state, 'paper')
  assert.equal(state.activeId, 'paper')
  assert.ok(state.installed.some((item) => item.id === 'neutral'))
  assert.throws(() => removeTheme(state, 'paper'), /activate another theme/i)
})

test('extension event failures are isolated from later extensions', async () => {
  resetExtensionRegistryForTests()
  let called = false
  const bad = createExtensionApi({ id: 'bad-extension', version: '1.0.0', apiVersion: '1.0.0' })
  const good = createExtensionApi({ id: 'good-extension', version: '1.0.0', apiVersion: '1.0.0' })
  bad.on('content:afterSave', () => { throw new Error('boom') })
  good.on('content:afterSave', () => { called = true })
  await emitExtensionEvent('content:afterSave', { item: { id: 'entry' } })
  assert.equal(called, true)
  assert.equal(getExtensionErrors().length, 1)
})

test('extension filters operate on cloned values', async () => {
  resetExtensionRegistryForTests()
  const extension = createExtensionApi({ id: 'metadata-example', version: '1.0.0', apiVersion: '1.0.0' })
  extension.filter('metadata', (value) => ({ ...value, extra: true }))
  const original = { extra: false }
  const filtered = await applyExtensionFilters('metadata', original)
  assert.deepEqual(original, { extra: false })
  assert.deepEqual(filtered, { extra: true })
})

test('TOTP generation matches RFC 6238 SHA-1 dynamic truncation for six digits', async () => {
  const secret = new TextEncoder().encode('12345678901234567890')
  assert.equal(await generateTotpCode(secret, 1), '287082')
  assert.equal(await verifyTotpCode(secret, '287082', 59_000, 0), true)
  assert.equal(await verifyTotpCode(secret, '000000', 59_000, 0), false)
})

test('WebAuthn DER signatures convert to fixed-width P-256 raw signatures', () => {
  const der = Uint8Array.from([0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x02])
  const raw = derEcdsaToRaw(der, 32)
  assert.equal(raw.length, 64)
  assert.equal(raw[31], 1)
  assert.equal(raw[63], 2)
})

test('Webmention source validation rejects loopback/private literal hosts', () => {
  assert.throws(() => assertSafeRemoteUrl('http://127.0.0.1/post'), /private or local/)
  assert.throws(() => assertSafeRemoteUrl('http://192.168.1.3/post'), /private or local/)
  assert.equal(assertSafeRemoteUrl('https://example.org/post').hostname, 'example.org')
})

test('Webmention link verification resolves links and ignores fragments', () => {
  const html = '<p><a href="https://publication.example/post/one#reply">reply</a></p>'
  assert.equal(htmlLinksToTarget(html, 'https://source.example/post', 'https://publication.example/post/one'), true)
  assert.equal(htmlLinksToTarget(html, 'https://source.example/post', 'https://publication.example/post/two'), false)
  assert.equal(normalizeWebmentionUrl('https://example.org/a#x'), 'https://example.org/a')
})

test('outbound Webmention link extraction ignores same-origin and private targets', () => {
  const links = extractOutboundLinks(
    '<a href="/local">local</a><a href="https://remote.example/a">remote</a><a href="http://127.0.0.1/x">nope</a>',
    'https://publication.example/post/one',
  )
  assert.deepEqual(links, ['https://remote.example/a'])
})

test('public configuration schema includes IndieWeb identity and themes additively', () => {
  assert.equal(PUBLIC_CONFIG_SCHEMA_VERSION, 6)
  const config = normalizePublicConfig({
    identity: { publicationName: 'Example' },
    indieweb: { relMe: ['https://example.social/@person', 'javascript:bad'] },
    themes: { activeId: 'neutral' },
  })
  assert.equal(config.identity.publicationName, 'Example')
  assert.deepEqual(config.indieweb.relMe, ['https://example.social/@person'])
  assert.equal(config.themes.activeId, 'neutral')
})


test('account-security routes expose enrollment, confirmation, recovery, disable, and passkey removal flows', () => {
  const accountRoute = fs.readFileSync(new URL('../functions/api/account-security.js', import.meta.url), 'utf8')
  const loginRoute = fs.readFileSync(new URL('../functions/api/login.js', import.meta.url), 'utf8')
  const webauthnRoute = fs.readFileSync(new URL('../functions/api/webauthn.js', import.meta.url), 'utf8')
  assert.match(accountRoute, /action === 'totp\.begin'/)
  assert.match(accountRoute, /action === 'totp\.confirm'/)
  assert.match(accountRoute, /action === 'totp\.disable'/)
  assert.match(accountRoute, /action === 'recovery\.regenerate'/)
  assert.match(accountRoute, /action === 'passkey\.remove'/)
  assert.match(accountRoute, /requirePassword/)
  assert.match(loginRoute, /requiresSecondFactor: true/)
  assert.match(loginRoute, /verifySecondFactorChallenge/)
  assert.match(webauthnRoute, /register\.options/)
  assert.match(webauthnRoute, /authenticate\.finish/)
})

test('native content saves include optimistic conflict protection and exclude autosave/preview Webmention sends', () => {
  const api = fs.readFileSync(new URL('../functions/api/native-content.js', import.meta.url), 'utf8')
  const client = fs.readFileSync(new URL('../src/lib/nativePublicContentApi.js', import.meta.url), 'utf8')
  assert.match(api, /expectedUpdatedAt/)
  assert.match(api, /\}, 409\)/)
  assert.match(api, /!\['autosave', 'preview'\]\.includes\(revisionNote\)/)
  assert.match(client, /expectedUpdatedAt/)
})
