import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { EVIDENCE_STATES, normalizeInvestigation, normalizeRecordsRequest, RECORDS_REQUEST_TYPES } from '../shared/investigationModel.js'

test('investigation evidence states remain generic and explicit', () => {
  assert.deepEqual(EVIDENCE_STATES, ['DOCUMENTED', 'INFERENCE', 'OPEN'])
})

test('records requests support federal state municipal and other regimes', () => {
  assert.deepEqual(RECORDS_REQUEST_TYPES, ['FOIA', 'state public-records law', 'municipal records request', 'other'])
  const item = normalizeRecordsRequest({
    title: 'Communications logs', agency: 'City Clerk', jurisdiction: 'Example City', requestType: 'municipal records request',
    requestMethod: 'portal', requestUrl: 'https://example.org/records', submittedDate: '2026-01-02', trackingNumber: 'REQ-12',
    statutoryDueDate: '2026-01-09', followUpDate: '2026-01-12', responseDate: '2026-01-15', feeStatus: 'waived', appealStatus: 'none',
    publicNotes: 'Public progress note', internalNotes: 'Internal reporting note', sourceIds: ['source-1'], attachmentUrls: ['https://example.org/record.pdf'],
  })
  assert.equal(item.jurisdiction, 'Example City')
  assert.equal(item.requestType, 'municipal records request')
  assert.equal(item.trackingNumber, 'REQ-12')
  assert.equal(item.publicNotes, 'Public progress note')
  assert.equal(item.internalNotes, 'Internal reporting note')
  assert.deepEqual(item.sourceIds, ['source-1'])
})

test('legacy records-request names keep round-tripping into the generic model', () => {
  const item = normalizeRecordsRequest({ dateFiled: '2026-02-01', requestNumber: 'OLD-9', lastResponseDate: '2026-02-03', publicExplanation: 'Public', notes: 'Internal' })
  assert.equal(item.submittedDate, '2026-02-01')
  assert.equal(item.trackingNumber, 'OLD-9')
  assert.equal(item.responseDate, '2026-02-03')
  assert.equal(item.dateFiled, item.submittedDate)
  assert.equal(item.requestNumber, item.trackingNumber)
  assert.equal(item.lastResponseDate, item.responseDate)
  assert.equal(item.publicExplanation, 'Public')
  assert.equal(item.notes, 'Internal')
})

test('fresh investigation model contains no seeded story, actor, or agency', () => {
  const item = normalizeInvestigation({})
  assert.equal(item.title, '')
  assert.equal(item.sources.length, 0)
  assert.equal(item.recordsRequests.length, 0)
  const source = fs.readFileSync(new URL('../shared/investigationModel.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /Example Network|Example Network|Andy Ngo|Marco Rubio|Shideler|Community Food Project|Field Contributor/)
})

test('records admin separates public notes from internal notes and is not FOIA-only', () => {
  const admin = fs.readFileSync(new URL('../src/components/InvestigationsAdminPage.jsx', import.meta.url), 'utf8')
  assert.match(admin, /Request type \/ law/)
  assert.match(admin, /Jurisdiction/)
  assert.match(admin, /Statutory due date/)
  assert.match(admin, /Fee status/)
  assert.match(admin, /Public notes/)
  assert.match(admin, /Internal notes/)
  assert.match(admin, /RECORDS_REQUEST_TYPES/)
})

test('public investigation view never renders internal records notes', () => {
  const page = fs.readFileSync(new URL('../src/components/InvestigationPages.jsx', import.meta.url), 'utf8')
  assert.match(page, /request\.publicNotes/)
  assert.doesNotMatch(page, /request\.internalNotes/)
  assert.match(page, /Chronology is not causation/)
})
