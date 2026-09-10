export const INVESTIGATION_STATUSES = Object.freeze(['developing', 'active', 'published', 'archived'])
export const INVESTIGATION_PUBLICATION_STATUSES = Object.freeze(['draft', 'published'])
export const EVIDENCE_STATES = Object.freeze(['DOCUMENTED', 'INFERENCE', 'OPEN'])
export const RECORDS_REQUEST_STATUSES = Object.freeze([
  'Researching', 'Drafting', 'Ready to file', 'Filed', 'Acknowledged', 'Processing',
  'Clarification requested', 'Fee issue', 'Partial response', 'Partial release', 'Records released',
  'Completed', 'Denied', 'Appealed', 'Litigation / external review', 'Closed',
])
export const RECORDS_DOCUMENT_TYPES = Object.freeze(['acknowledgement','clarification','fee notice','correspondence','denial','appeal','appeal decision','release','responsive record','other'])
export const RECORDS_REQUEST_TYPES = Object.freeze([
  'FOIA', 'state public-records law', 'municipal records request', 'other',
])
export const SOURCE_TYPES = Object.freeze([
  'government document', 'hearing/testimony', 'press release', 'social post',
  'archived webpage', 'article', 'interview', 'email/correspondence', 'public-records response',
  'PDF', 'image', 'audio', 'video',
])

export function slugifyInvestigation(value = '') {
  return String(value || '').toLowerCase().trim().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function investigationId() {
  if (globalThis.crypto?.randomUUID) return `investigation-${globalThis.crypto.randomUUID()}`
  return `investigation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function itemId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function string(value = '') { return String(value ?? '').trim() }
function array(value) { return Array.isArray(value) ? value : [] }
function validEvidence(value, fallback = 'DOCUMENTED') { return EVIDENCE_STATES.includes(value) ? value : fallback }
function safeHref(value = '') {
  const href = string(value)
  if (!href) return ''
  if (href.startsWith('/') || href.startsWith('#')) return href
  return /^(https?:\/\/|mailto:|tel:)/i.test(href) ? href : ''
}

export function normalizeSource(source = {}) {
  return {
    id: string(source.id) || itemId('source'),
    title: string(source.title),
    type: SOURCE_TYPES.includes(source.type) ? source.type : string(source.type) || 'article',
    publisher: string(source.publisher || source.agency || source.account),
    originalUrl: safeHref(source.originalUrl || source.url),
    archiveUrl: safeHref(source.archiveUrl),
    date: string(source.date),
    capturedAt: string(source.capturedAt),
    attachmentUrl: safeHref(source.attachmentUrl || source.file),
    excerpt: string(source.excerpt),
    notes: string(source.notes),
    relatedClaim: string(source.relatedClaim),
    evidenceState: validEvidence(source.evidenceState),
    availability: string(source.availability || 'available'),
  }
}

export function normalizeTimelineEvent(event = {}) {
  return {
    id: string(event.id) || itemId('timeline'),
    date: string(event.date),
    title: string(event.title),
    body: string(event.body || event.description),
    evidenceState: validEvidence(event.evidenceState),
    sourceIds: array(event.sourceIds).map(string).filter(Boolean),
    relatedClaim: string(event.relatedClaim),
  }
}

export function normalizeRecordsDocument(document = {}) {
  return {
    id: string(document.id) || itemId('record-document'),
    type: RECORDS_DOCUMENT_TYPES.includes(document.type) ? document.type : 'other',
    title: string(document.title),
    date: string(document.date),
    url: safeHref(document.url || document.attachmentUrl),
    notes: string(document.notes),
    public: document.public !== false && document.visibility !== 'private',
  }
}

export function normalizeRecordsRequest(request = {}) {
  const status = RECORDS_REQUEST_STATUSES.includes(request.status) ? request.status : 'Drafting'
  const requestType = RECORDS_REQUEST_TYPES.includes(request.requestType) ? request.requestType : RECORDS_REQUEST_TYPES.includes(request.lawType) ? request.lawType : 'other'
  const submittedDate = string(request.submittedDate || request.dateFiled)
  const trackingNumber = string(request.trackingNumber || request.requestNumber)
  const responseDate = string(request.responseDate || request.lastResponseDate)
  const internalNotes = string(request.internalNotes || request.notes)
  const publicNotes = string(request.publicNotes || request.publicExplanation)
  const sourceIds = array(request.sourceIds || request.responsiveRecordIds).map(string).filter(Boolean)
  const attachmentUrls = array(request.attachmentUrls || request.sourceAttachments).map(safeHref).filter(Boolean)
  const title = string(request.title || request.internalTitle || request.publicTitle)
  return {
    id: string(request.id) || itemId('records'), title, internalTitle: string(request.internalTitle || title), publicTitle: string(request.publicTitle || title),
    agency: string(request.agency), agencyComponent: string(request.agencyComponent || request.component), jurisdiction: string(request.jurisdiction),
    requestType, lawName: string(request.lawName), requestMethod: string(request.requestMethod || request.method), requestUrl: safeHref(request.requestUrl || request.officialFilingUrl || request.url), officialFilingUrl: safeHref(request.officialFilingUrl || request.requestUrl || request.url),
    description: string(request.description), whyItMatters: string(request.whyItMatters), recordsSought: string(request.recordsSought || request.description), requestText: string(request.requestText), requestTextPublic: Boolean(request.requestTextPublic),
    dateRange: string(request.dateRange), preferredFormat: string(request.preferredFormat), feeWaiverLanguage: string(request.feeWaiverLanguage), expeditedProcessingLanguage: string(request.expeditedProcessingLanguage),
    submittedDate, trackingNumber, status, statutoryDueDate: string(request.statutoryDueDate), followUpDate: string(request.followUpDate), responseDate, feeStatus: string(request.feeStatus), appealStatus: string(request.appealStatus), expectedNextStep: string(request.expectedNextStep), responsiveDocuments: string(request.responsiveDocuments), exemptionsRedactions: string(request.exemptionsRedactions), publicNotes, internalNotes, sourceIds, attachmentUrls,
    documents: array(request.documents).map(normalizeRecordsDocument), public: request.public !== false && request.visibility !== 'private', order: Number.isFinite(Number(request.order)) ? Number(request.order) : 0,
    dateFiled: submittedDate, requestNumber: trackingNumber, lastResponseDate: responseDate, notes: internalNotes, publicExplanation: publicNotes,
  }
}

export function publicRecordsRequest(request = {}) {
  const item = normalizeRecordsRequest(request)
  if (!item.public) return null
  const { internalTitle, internalNotes, notes, feeWaiverLanguage, expeditedProcessingLanguage, ...safe } = item
  safe.title = item.publicTitle || item.title
  safe.requestText = item.requestTextPublic ? item.requestText : ''
  safe.documents = item.documents.filter((document) => document.public)
  return safe
}

export function publicInvestigation(input = {}) {
  const item = normalizeInvestigation(input)
  return { ...item, recordsRequests: item.recordsRequests.map(publicRecordsRequest).filter(Boolean) }
}

export function normalizeInvestigationRelation(relation = {}) {
  return {
    id: string(relation.id) || itemId('relation'),
    relationType: string(relation.relationType || relation.type || 'related'),
    targetType: string(relation.targetType || 'post').toLowerCase(),
    targetId: string(relation.targetId),
    targetSlug: string(relation.targetSlug || relation.slug),
    label: string(relation.label || relation.title),
    href: safeHref(relation.href),
    note: string(relation.note),
  }
}

export function normalizeInvestigation(input = {}) {
  const now = new Date().toISOString()
  const title = string(input.title)
  const slug = string(input.slug) || slugifyInvestigation(title)
  const status = INVESTIGATION_STATUSES.includes(input.status) ? input.status : 'developing'
  const publicationStatus = INVESTIGATION_PUBLICATION_STATUSES.includes(input.publicationStatus)
    ? input.publicationStatus : 'draft'
  return {
    id: string(input.id) || investigationId(),
    slug,
    title,
    deck: string(input.deck),
    summary: string(input.summary),
    explainer: string(input.explainer),
    howToUse: string(input.howToUse),
    question: string(input.question),
    stakes: string(input.stakes),
    decisionTree: string(input.decisionTree),
    heroImage: string(input.heroImage),
    heroAlt: string(input.heroAlt),
    status,
    publicationStatus,
    openedAt: string(input.openedAt),
    publishedAt: string(input.publishedAt),
    createdAt: string(input.createdAt) || now,
    updatedAt: string(input.updatedAt) || now,
    sources: array(input.sources).map(normalizeSource),
    timeline: array(input.timeline).map(normalizeTimelineEvent),
    recordsRequests: array(input.recordsRequests).map(normalizeRecordsRequest),
    relations: array(input.relations).map(normalizeInvestigationRelation),
    openQuestions: array(input.openQuestions).map((item) => typeof item === 'string'
      ? { id: itemId('question'), text: string(item), state: 'open' }
      : { id: string(item.id) || itemId('question'), text: string(item.text || item.question), state: string(item.state || 'open') }).filter((item) => item.text),
    updateLog: array(input.updateLog).map((item) => ({
      id: string(item.id) || itemId('update'), date: string(item.date), title: string(item.title), body: string(item.body),
    })).filter((item) => item.title || item.body),
  }
}

export function blankInvestigation() {
  return normalizeInvestigation({ title: '', slug: '', status: 'developing', publicationStatus: 'draft' })
}

export function investigationRelationHref(relation = {}) {
  const item = normalizeInvestigationRelation(relation)
  if (item.href) return item.href
  const key = item.targetSlug || item.targetId
  if (!key) return ''
  if (item.targetType === 'post' || item.targetType === 'article') return `/post/${encodeURIComponent(key)}`
  if (item.targetType === 'campaign') return `/campaigns/${encodeURIComponent(key)}`
  if (item.targetType === 'investigation') return `/investigations/${encodeURIComponent(key)}`
  if (item.targetType === 'publication') return `/publications/${encodeURIComponent(key)}`
  return ''
}
