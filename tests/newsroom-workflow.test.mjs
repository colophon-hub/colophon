import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  applyReviewAction,
  appendEditorialComment,
  canEditEntry,
  canReadPrivateEntry,
  prepareEntryForWrite,
} from '../functions/api/_lib/editorialWorkflow.js'

const contributor = { canAccessAdmin: true, role: 'contributor', actor: 'writer@example.test', user: { id: 'u-writer', email: 'writer@example.test', displayName: 'Writer' }, capabilities: ['content:write', 'media:write', 'review:comment'] }
const otherContributor = { ...contributor, actor: 'other@example.test', user: { id: 'u-other', email: 'other@example.test', displayName: 'Other' } }
const editor = { canAccessAdmin: true, role: 'editor', actor: 'editor@example.test', user: { id: 'u-editor', email: 'editor@example.test', displayName: 'Editor' }, capabilities: ['content:write', 'media:write', 'publishing:write', 'review:manage', 'review:comment', 'analytics:view'] }
const base = { id: 'native-1', title: 'Draft', status: 'draft', workflowState: 'draft', ownerAccountId: 'u-writer', ownerEmail: 'writer@example.test', editorialComments: [] }

test('contributor can read and edit own unpublished content', () => {
  assert.equal(canReadPrivateEntry(contributor, base), true)
  assert.equal(canEditEntry(contributor, base), true)
})

test('contributor cannot read or edit another contributor content', () => {
  assert.equal(canReadPrivateEntry(otherContributor, base), false)
  assert.equal(canEditEntry(otherContributor, base), false)
})

test('legacy ownerless content is not claimable by a contributor', () => {
  assert.equal(canEditEntry(contributor, { ...base, ownerAccountId: '' }), false)
  assert.equal(canEditEntry(editor, { ...base, ownerAccountId: '' }), true)
})

test('new contributor content receives stable account ownership', () => {
  const next = prepareEntryForWrite(contributor, null, { id: 'native-new', title: 'New', status: 'draft', workflowState: 'draft' })
  assert.equal(next.ownerAccountId, 'u-writer')
  assert.equal(next.status, 'draft')
})

test('contributor cannot publish by changing status directly', () => {
  assert.throws(() => prepareEntryForWrite(contributor, base, { ...base, status: 'published', workflowState: 'published' }), /cannot publish/i)
})

test('contributor can submit own draft', () => {
  const next = applyReviewAction(contributor, base, 'submit')
  assert.equal(next.workflowState, 'in_review')
  assert.equal(next.status, 'draft')
  assert.ok(next.submittedAt)
})

test('contributor cannot submit another account work', () => {
  assert.throws(() => applyReviewAction(otherContributor, base, 'submit'), /only submit their own/i)
})

test('editor can request changes', () => {
  const next = applyReviewAction(editor, { ...base, workflowState: 'in_review' }, 'request_changes')
  assert.equal(next.workflowState, 'needs_revision')
})

test('editor can approve content as ready', () => {
  const next = applyReviewAction(editor, { ...base, workflowState: 'in_review' }, 'approve')
  assert.equal(next.workflowState, 'ready')
})

test('decline preserves content and marks decision metadata', () => {
  const next = applyReviewAction(editor, { ...base, workflowState: 'in_review' }, 'decline')
  assert.equal(next.id, base.id)
  assert.equal(next.workflowState, 'declined')
  assert.ok(next.declinedAt)
})

test('only ready content can publish', () => {
  assert.throws(() => applyReviewAction(editor, { ...base, workflowState: 'in_review' }, 'publish'), /must be ready/i)
  const next = applyReviewAction(editor, { ...base, workflowState: 'ready' }, 'publish')
  assert.equal(next.status, 'published')
})

test('contributor can comment on own piece but not another piece', () => {
  const next = appendEditorialComment(base, contributor, 'I fixed the requested section.')
  assert.equal(next.editorialComments.length, 1)
  assert.throws(() => appendEditorialComment(base, otherContributor, 'Nope'), /permission/i)
})

test('role source defines contributor without publishing or review management', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const source = fs.readFileSync(path.join(here, '../functions/api/_lib/adminUsers.js'), 'utf8')
  assert.match(source, /contributor:\s*\['content:write', 'media:write', 'review:comment'\]/)
  assert.doesNotMatch(source.match(/contributor:[\s\S]*?viewer:/)?.[0] || '', /publishing:write|review:manage/)
})

test('revision restore endpoint requires review or publishing authority', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const source = fs.readFileSync(path.join(here, '../functions/api/native-content-revisions.js'), 'utf8')
  assert.match(source, /review:manage/)
  assert.match(source, /publishing:write/)
})
