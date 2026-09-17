import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/components/ContentListPage.jsx', import.meta.url), 'utf8')

test('Posts reconciles trash mutations against authoritative storage', () => {
  assert.match(source, /async function reconcileItems\([\s\S]*loadNativeCollection\(\{ includeFuture: 1 \}\)[\s\S]*setItems\(authoritative\)/)
  assert.match(source, /async function updatePostStatus[\s\S]*setItems\(optimistic\)[\s\S]*upsertNativeEntry[\s\S]*reconcileItems\(next\)/)
  assert.match(source, /bulkAction === 'trash'[\s\S]*setItems\(\(current\) => current\.map[\s\S]*reconcileItems\(next\)/)
})

test('Posts keeps Trash out of All and uses real delete persistence', () => {
  assert.match(source, /tab === 'all' && bucket === 'trash'/)
  assert.match(source, /async function permanentlyDelete[\s\S]*deleteNativeEntry\(items, id\)[\s\S]*reconcileItems\(next\)/)
  assert.match(source, /async function emptyTrash[\s\S]*deleteNativeEntry\(next, id\)[\s\S]*reconcileItems\(next\)/)
})
