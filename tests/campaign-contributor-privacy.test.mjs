import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { filterContributorMessages } from '../functions/api/_lib/campaignCorrespondencePrivacy.js'

test('contributor rooms never expose another contributor private message', () => {
  const allMessages = [
    { id: 'mine', contributorId: 'alice', visibility: 'private', status: 'sent' },
    { id: 'other-private', contributorId: 'bob', visibility: 'private', status: 'sent' },
    { id: 'editor-for-me', contributorId: null, visibility: 'private', status: 'sent' },
    { id: 'editor-for-other', contributorId: null, visibility: 'private', status: 'sent' },
    { id: 'public', contributorId: 'bob', visibility: 'public', status: 'sent' },
  ]
  const visible = filterContributorMessages({
    allMessages,
    publicMessages: [allMessages[4]],
    recipientMessageIds: ['editor-for-me'],
  }, 'alice')
  assert.deepEqual(visible.map((message) => message.id), ['mine', 'editor-for-me', 'public'])
})

test('missing contributor identity fails closed', () => {
  const visible = filterContributorMessages({
    allMessages: [{ id: 'private', contributorId: 'alice', visibility: 'private' }],
    publicMessages: [],
    recipientMessageIds: [],
  }, '')
  assert.deepEqual(visible, [])
})

test('PIN login and room refresh use contributor-scoped message loading', () => {
  const auth = fs.readFileSync(new URL('../functions/api/campaign-contributor-auth.js', import.meta.url), 'utf8')
  const correspondence = fs.readFileSync(new URL('../functions/api/campaign-correspondence.js', import.meta.url), 'utf8')
  assert.match(auth, /listContributorMessages\(db, campaign\.id, result\.contributor\.id\)/)
  assert.match(correspondence, /listContributorMessages\(db, campaign\.id, contributor\.id\)/)
  assert.doesNotMatch(auth, /messages:\s*await listMessages\(db, campaign\.id\)/)
})

test('private editor messages are assigned to a specific contributor and audited', () => {
  const privacy = fs.readFileSync(new URL('../functions/api/_lib/campaignCorrespondencePrivacy.js', import.meta.url), 'utf8')
  const correspondence = fs.readFileSync(new URL('../functions/api/campaign-correspondence.js', import.meta.url), 'utf8')
  assert.match(privacy, /campaign_message_recipients/)
  assert.match(privacy, /Choose which contributor should receive this private message/)
  assert.match(correspondence, /assignPrivateEditorRecipient/)
  assert.match(correspondence, /campaign_correspondence\.message\.create/)
  assert.match(correspondence, /directPublicationConfirmed/)
})

test('generic contributor message patch cannot silently confirm publication', () => {
  const correspondence = fs.readFileSync(new URL('../functions/api/campaign-correspondence.js', import.meta.url), 'utf8')
  assert.match(correspondence, /body\.action === 'publish-message'/)
  assert.match(correspondence, /publicationConfirmed: publishRequested/)
  assert.match(correspondence, /patchMessage\(db, body\.id, body, actingAsContributor \? \{ contributorId: contributor\.id, permissions: contributor\.permissions \}/)
})

test('contributor session remains persistent in the browser and invalid sessions are removed', () => {
  const page = fs.readFileSync(new URL('../src/components/CampaignContributorPage.jsx', import.meta.url), 'utf8')
  assert.match(page, /localStorage\.getItem\(storageKey\)/)
  assert.match(page, /localStorage\.setItem\(storageKey, data\.session\)/)
  assert.match(page, /localStorage\.removeItem\(storageKey\)/)
})
