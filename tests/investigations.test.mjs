import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  EVIDENCE_STATES,
  INVESTIGATION_STATUSES,
  RECORDS_REQUEST_STATUSES,
  investigationRelationHref,
  normalizeInvestigation,
} from '../shared/investigationModel.js'

test('investigation lifecycle is separate from public visibility', () => {
  const draftActive = normalizeInvestigation({ title: 'Test', status: 'active', publicationStatus: 'draft' })
  assert.equal(draftActive.status, 'active')
  assert.equal(draftActive.publicationStatus, 'draft')
  const publicDeveloping = normalizeInvestigation({ title: 'Test 2', status: 'developing', publicationStatus: 'published' })
  assert.equal(publicDeveloping.status, 'developing')
  assert.equal(publicDeveloping.publicationStatus, 'published')
  assert.deepEqual(INVESTIGATION_STATUSES, ['developing', 'active', 'published', 'archived'])
})

test('evidence and public-records states use the reporting vocabulary', () => {
  assert.deepEqual(EVIDENCE_STATES, ['DOCUMENTED', 'INFERENCE', 'OPEN'])
  assert.ok(RECORDS_REQUEST_STATUSES.includes('Partial response'))
  assert.ok(RECORDS_REQUEST_STATUSES.includes('Litigation / external review'))
  const item = normalizeInvestigation({
    title: 'Evidence test',
    sources: [{ title: 'Receipt', evidenceState: 'OPEN' }],
    timeline: [{ title: 'Event', evidenceState: 'INFERENCE' }],
  })
  assert.equal(item.sources[0].evidenceState, 'OPEN')
  assert.equal(item.timeline[0].evidenceState, 'INFERENCE')
})

test('investigation relations resolve articles and campaigns without slug-specific code', () => {
  assert.equal(investigationRelationHref({ targetType: 'post', targetSlug: 'reported-story' }), '/post/reported-story')
  assert.equal(investigationRelationHref({ targetType: 'campaign', targetSlug: 'public-campaign' }), '/campaigns/public-campaign')
  assert.equal(investigationRelationHref({ targetType: 'investigation', targetSlug: 'second-case' }), '/investigations/second-case')
})

test('investigation database schema uses reusable source, records, timeline and relation tables', () => {
  const sql = fs.readFileSync(new URL('../db/investigations.sql', import.meta.url), 'utf8')
  assert.match(sql, /CREATE TABLE IF NOT EXISTS investigations/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS investigation_sources/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS investigation_timeline_events/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS records_requests/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_relations/)
})

test('public and admin investigation routes are wired and the masthead uses module-aware navigation', () => {
  const routes = fs.readFileSync(new URL('../src/routing/routes.js', import.meta.url), 'utf8')
  const topbar = fs.readFileSync(new URL('../src/components/PublicationTopbar.jsx', import.meta.url), 'utf8')
  const boundary = fs.readFileSync(new URL('../src/components/InvestigationRouteBoundary.jsx', import.meta.url), 'utf8')
  assert.match(routes, /investigations: '\/investigations'/)
  assert.match(routes, /investigation: '\/investigations\/:slug'/)
  assert.match(routes, /investigations: '\/wp-admin\/investigations'/)
  assert.match(topbar, /resolveVisibleNavigation/)
  assert.doesNotMatch(topbar, /defaultLabel="Investigations"/)
  assert.match(boundary, /PublishingModuleGate moduleId="investigations"/)
  assert.match(boundary, /InvestigationDetailPage/)
  assert.match(boundary, /InvestigationsAdminPage/)
})

test('hosted investigation API fails closed when the authoritative database is missing', () => {
  const api = fs.readFileSync(new URL('../functions/api/investigations.js', import.meta.url), 'utf8')
  assert.match(api, /databaseUnavailable\('investigation reads'\)/)
  assert.match(api, /databaseUnavailable\('investigation writes'\)/)
  assert.match(api, /databaseUnavailable\('investigation deletes'\)/)
})
