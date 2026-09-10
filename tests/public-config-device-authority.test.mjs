import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const publicConfig = fs.readFileSync(new URL('../src/lib/publicConfig.js', import.meta.url), 'utf8')
const resolvedConfig = fs.readFileSync(new URL('../src/lib/useResolvedConfig.js', import.meta.url), 'utf8')
const editContext = fs.readFileSync(new URL('../src/components/PublicEditContext.jsx', import.meta.url), 'utf8')
const infoPage = fs.readFileSync(new URL('../src/components/PublicInfoPage.jsx', import.meta.url), 'utf8')

test('published public config never implicitly falls back to browser localStorage', () => {
  assert.match(publicConfig, /resolvePublicConfig\(runtimeConfig = \{\}\)/)
  const resolveBody = publicConfig.slice(publicConfig.indexOf('export function resolvePublicConfig'), publicConfig.indexOf('export function getConfiguredText'))
  assert.doesNotMatch(resolveBody, /getStoredPublicConfig/)
  assert.match(resolveBody, /mergeSchemaConfigs\(publicSiteDefaults, genericPublicDefaults\)/)
  assert.match(resolveBody, /mergeSchemaConfigs\(genericBase, runtimeConfig \|\| \{\}\)/)
})

test('non-editing public pages require loaded authoritative config and ignore edit drafts', () => {
  assert.match(resolvedConfig, /authoritativeMode\(backendMode\)/)
  assert.match(resolvedConfig, /mode === 'd1'/)
  assert.match(resolvedConfig, /mode === 'browser-local'/)
  assert.match(resolvedConfig, /loadState !== 'loaded'/)
  assert.match(resolvedConfig, /isAdmin && isEditing/)
  assert.match(resolvedConfig, /savedConfig \|\| EMPTY_CONFIG/)
  const publishedPath = resolvedConfig.slice(resolvedConfig.indexOf('if (!authoritativeMode(backendMode)'))
  assert.doesNotMatch(publishedPath, /effectiveConfig \|\| EMPTY_CONFIG/)
})

test('legacy local edit caches remain drafts and migrate to the current draft key', () => {
  assert.match(editContext, /colophon-public-edit-draft-v2/)
  assert.match(editContext, /colophon-public-edit-draft-v3/)
  assert.match(editContext, /colophon-public-edit-draft-v4/)
  assert.match(editContext, /colophon-public-edit-draft-v5/)
  assert.match(editContext, /LEGACY_STORAGE_KEYS\.map\(\(key\) => window\.localStorage\.getItem\(key\)\)\.find\(Boolean\)/)
  assert.match(editContext, /LEGACY_STORAGE_KEYS\.forEach\(\(key\) => window\.localStorage\.removeItem\(key\)\)/)
  assert.match(editContext, /effectiveConfig/)
  assert.match(resolvedConfig, /isAdmin && isEditing/)
  assert.match(resolvedConfig, /authoritative store for the active runtime/)
  assert.doesNotMatch(resolvedConfig, /getStoredPublicConfig/)
})

test('about contact submit support and security share the authoritative PublicInfoPage renderer', () => {
  assert.match(infoPage, /getEditablePage\(page\)/)
  assert.match(infoPage, /EditableText/)
  assert.match(infoPage, /editablePage\.body\.field/)
})
