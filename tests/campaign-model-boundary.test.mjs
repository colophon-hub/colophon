import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { normalizeCampaign, visibleCampaignRows } from '../shared/campaignModel.js'
import { mergePublicConfig, normalizePublicConfig } from '../src/lib/publicConfigSchema.js'

test('fresh campaign code has no built-in publication campaigns', () => {
  const source = fs.readFileSync(new URL('../functions/api/_lib/campaigns.js', import.meta.url), 'utf8')
  assert.match(source, /ensureDefaultCampaigns\(db\).*return \[\]/s)
  assert.doesNotMatch(source, /ensureAiCampaign|defaultAiCampaign|defaultFnbGazaCampaign|AI_CAMPAIGN_ID|FNB_GAZA/)
  assert.doesNotMatch(source, /cannot be deleted|seeded A\/I campaign/)
})

test('legacy campaign status migrates into the lifecycle axis', () => {
  assert.equal(normalizeCampaign({ title: 'A', campaignStatus: 'completed' }).lifecycleStatus, 'completed')
  assert.equal(normalizeCampaign({ title: 'B', campaignStatus: 'archived' }).lifecycleStatus, 'archived')
  assert.equal(normalizeCampaign({ title: 'C', campaignStatus: 'monitoring' }).lifecycleStatus, 'active')
})

test('publication visibility and lifecycle remain independent', () => {
  const item = normalizeCampaign({ title: 'Paused draft', status: 'draft', lifecycleStatus: 'inactive' })
  assert.equal(item.status, 'draft')
  assert.equal(item.lifecycleStatus, 'inactive')
  assert.equal('campaignStatus' in item, false)
})

test('moderation is independent and hidden rows stay stored but leave public output', () => {
  const campaign = normalizeCampaign({ title: 'Rows', social: [
    { id: 'ordinary', excerpt: 'one', moderationStatus: 'automatic' },
    { id: 'featured', excerpt: 'two', moderationStatus: 'featured' },
    { id: 'hidden', excerpt: 'three', moderationStatus: 'hidden' },
  ] })
  assert.equal(campaign.social.length, 3)
  assert.deepEqual(visibleCampaignRows(campaign.social).map((row) => row.id), ['featured', 'ordinary'])
  assert.equal(campaign.status, 'published')
})

test('publication identity is configurable without losing existing saved values', () => {
  const base = normalizePublicConfig({ identity: { publicationName: 'North Star', correspondenceLabel: 'Newsroom' } })
  const merged = mergePublicConfig(base, { identity: { contactEmail: 'desk@example.org' } })
  assert.equal(merged.identity.publicationName, 'North Star')
  assert.equal(merged.identity.correspondenceLabel, 'Newsroom')
  assert.equal(merged.identity.contactEmail, 'desk@example.org')
})

test('generic campaign defaults do not claim a publication identity', () => {
  const source = fs.readFileSync(new URL('../src/lib/campaignDeadline.js', import.meta.url), 'utf8')
  assert.match(source, /Publication editor/)
  assert.doesNotMatch(source, /Ash|Field Contributor|Example Network|Example Network|Community Food Project|chuffed\.org/)
})
