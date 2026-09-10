import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { filterContributorMessages } from '../functions/api/_lib/campaignCorrespondencePrivacy.js'

const endpoint = fs.readFileSync(new URL('../functions/api/campaign-correspondence.js', import.meta.url), 'utf8')
const privacy = fs.readFileSync(new URL('../functions/api/_lib/campaignCorrespondencePrivacy.js', import.meta.url), 'utf8')
const admin = fs.readFileSync(new URL('../src/components/CampaignCorrespondenceAdmin.jsx', import.meta.url), 'utf8')
const contributor = fs.readFileSync(new URL('../src/components/CampaignContributorPage.jsx', import.meta.url), 'utf8')
const identity = fs.readFileSync(new URL('../functions/api/_lib/campaignPublicIdentity.js', import.meta.url), 'utf8')

test('private contributor filtering fails closed for unassigned editor messages', () => {
  const messages = [
    { id: 'alice-own', contributorId: 'alice', senderRole: 'contributor', visibility: 'private' },
    { id: 'bob-own', contributorId: 'bob', senderRole: 'contributor', visibility: 'private' },
    { id: 'to-alice', contributorId: null, senderRole: 'editor', visibility: 'private' },
    { id: 'unassigned', contributorId: null, senderRole: 'editor', visibility: 'private' },
    { id: 'public', contributorId: 'bob', senderRole: 'contributor', visibility: 'public' },
  ]
  const visible = filterContributorMessages({ allMessages: messages, publicMessages: [messages[4]], recipientMessageIds: ['to-alice'] }, 'alice')
  assert.deepEqual(visible.map((item) => item.id), ['alice-own', 'to-alice', 'public'])
})

test('admin private replies require a selected active contributor', () => {
  assert.match(admin, /Send privately to/)
  assert.match(admin, /recipientContributorId: recipientId/)
  assert.match(admin, /No active contributors/)
  assert.match(admin, /Recipient required/)
  assert.match(admin, /Assign recipient/)
  assert.doesNotMatch(admin, /Field Contributor|Community Food Project|Ash \/ Colophon/)
})

test('legacy recipient repair is explicit and audited', () => {
  assert.match(privacy, /repairPrivateEditorRecipient/)
  assert.match(privacy, /Only private editor messages can be assigned/)
  assert.match(endpoint, /body\.action === 'recipient'/)
  assert.match(endpoint, /campaign_correspondence\.message\.recipient/)
})

test('public correspondence still uses the confirmed public-only query', () => {
  assert.match(endpoint, /listMessages\(db, campaign\.id, \{ publicOnly: true \}\)/)
})

test('contributor destination language is explicit and campaign-specific', () => {
  assert.match(contributor, /Only you and the publication editors can see this/)
  assert.match(contributor, /Publish this publicly on/)
  assert.match(contributor, /campaign\.title/)
  assert.match(contributor, /PUBLISH TO WEBSITE/)
  assert.doesNotMatch(contributor, /Field Contributor|Community Food Project|Ash \/ Colophon|Example Campaign/)
})

test('campaign correspondence consumes configured publication identity with a generic fallback', () => {
  assert.match(identity, /readPublicSiteConfig/)
  assert.match(identity, /identity\.correspondenceLabel/)
  assert.match(identity, /Publication editor/)
  assert.match(identity, /Independent Publication/)
})
