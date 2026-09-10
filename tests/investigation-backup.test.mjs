import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { collectSystemSnapshot, summarizeSnapshot } from '../src/lib/systemBackup.js'

function list(items = []) { return { ok: true, mode: 'd1', items } }
function settings(value = {}) { return { ok: true, mode: 'd1', settings: value } }

function loaders(overrides = {}) {
  return {
    fetchNativeEntries: async () => list([]),
    fetchNativeRevisions: async () => list([]),
    fetchTaxonomyTerms: async () => list([]),
    fetchEditorRoles: async () => list([]),
    fetchAuditLog: async () => list([]),
    fetchMediaAssets: async () => list([]),
    fetchCollections: async () => list([]),
    fetchCampaigns: async () => list([]),
    fetchCampaignRevisions: async () => list([]),
    fetchCampaignCoverage: async () => list([]),
    fetchInvestigations: async () => list([{ id: 'investigation-one', title: 'One', recordsRequests: [{ requestType: 'state public-records law' }] }]),
    fetchInvestigationRevisions: async () => list([{ id: 'investigation-revision-one', investigationId: 'investigation-one', snapshot: { title: 'One' } }]),
    fetchPublications: async () => list([]),
    fetchSites: async () => list([]),
    fetchFeedSettings: async () => settings({}),
    fetchPodcastSettings: async () => settings({}),
    fetchAdminUsers: async () => list([]),
    loadPublicConfigPayload: async () => ({ ok: true, mode: 'd1', config: {} }),
    ...overrides,
  }
}

test('verified snapshot includes investigations and investigation revisions', async () => {
  const snapshot = await collectSystemSnapshot(loaders())
  assert.equal(snapshot.schemaVersion, 9)
  assert.ok(snapshot.manifest.datasets.includes('investigations'))
  assert.ok(snapshot.manifest.datasets.includes('investigationRevisions'))
  assert.equal(snapshot.investigations.length, 1)
  assert.equal(snapshot.investigationRevisions.length, 1)
  assert.equal(snapshot.investigations[0].recordsRequests[0].requestType, 'state public-records law')

  const summary = summarizeSnapshot(snapshot)
  assert.equal(summary.investigationCount, 1)
  assert.equal(summary.investigationRevisionCount, 1)
  assert.equal(summary.complete, true)
})

test('verified snapshot fails closed when investigations cannot be loaded', async () => {
  await assert.rejects(
    () => collectSystemSnapshot(loaders({ fetchInvestigations: async () => ({ ok: false, mode: 'unavailable' }) })),
    /investigations backup response was incomplete/,
  )
})

test('investigation revision endpoint is authenticated, database-backed and paginated', () => {
  const api = fs.readFileSync(new URL('../functions/api/investigation-revisions.js', import.meta.url), 'utf8')
  assert.match(api, /resolvePublicSitePermission/)
  assert.match(api, /databaseUnavailable\('investigation revision reads'\)/)
  assert.match(api, /investigation_revisions/)
  assert.match(api, /LIMIT \? OFFSET \?/)
  assert.match(api, /snapshot: parseJson/)
})
