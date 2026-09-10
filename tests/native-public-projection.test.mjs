import assert from 'node:assert/strict'
import test from 'node:test'
import { publicNativeItem, publicRelatedAsset } from '../functions/api/native-content.js'

test('public native projection strips editorial and private fields', () => {
  const publicItem = publicNativeItem({
    id: 'article-1',
    title: 'Public title',
    body: 'Public body',
    status: 'published',
    sourceUrl: 'https://example.org/source',
    sourceNotes: 'private sourcing notes',
    transcriptNotes: 'private transcript notes',
    workflowState: 'published',
    editorialNotes: 'editor only',
    moderationNotes: 'editor only',
    storageKey: 'private/storage/key',
    privateUrl: 'https://private.invalid/item',
    contributorId: 'contributor-secret',
    contactEmail: 'private@example.org',
    relatedAssets: [{
      id: 'asset-1',
      title: 'Public attachment',
      url: 'https://example.org/public.pdf',
      storageKey: 'media/private.pdf',
      customMetadata: { secret: true },
      contributorId: 'contributor-secret',
      campaignId: 'campaign-internal',
      internalNotes: 'private',
    }],
  })

  assert.equal(publicItem.title, 'Public title')
  assert.equal(publicItem.body, 'Public body')
  assert.equal(publicItem.sourceUrl, 'https://example.org/source')
  for (const key of ['sourceNotes', 'transcriptNotes', 'workflowState', 'editorialNotes', 'moderationNotes', 'storageKey', 'privateUrl', 'contributorId', 'contactEmail']) {
    assert.equal(Object.hasOwn(publicItem, key), false, `${key} should not be public`)
  }
  assert.equal(publicItem.relatedAssets[0].url, 'https://example.org/public.pdf')
  for (const key of ['storageKey', 'customMetadata', 'contributorId', 'campaignId', 'internalNotes']) {
    assert.equal(Object.hasOwn(publicItem.relatedAssets[0], key), false, `asset ${key} should not be public`)
  }
})

test('public projection does not mutate the editor record', () => {
  const source = { title: 'Title', sourceNotes: 'keep for editor', relatedAssets: [{ storageKey: 'keep-for-editor', url: '/file' }] }
  publicNativeItem(source)
  assert.equal(source.sourceNotes, 'keep for editor')
  assert.equal(source.relatedAssets[0].storageKey, 'keep-for-editor')
})

test('public related asset preserves ordinary public metadata', () => {
  assert.deepEqual(publicRelatedAsset({ id: 'a', url: '/a', alt: 'description', storageKey: 'secret' }), {
    id: 'a',
    url: '/a',
    alt: 'description',
  })
})
