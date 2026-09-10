import {
  normalizeInvestigation,
  normalizeInvestigationRelation,
  normalizeRecordsRequest,
  normalizeSource,
  normalizeTimelineEvent,
} from '../../../shared/investigationModel.js'

export async function ensureInvestigationTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    investigation_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'developing',
    publication_status TEXT NOT NULL DEFAULT 'draft',
    title TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_investigations_publication ON investigations(publication_status, updated_at DESC)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status, updated_at DESC)').run()

  await db.prepare(`CREATE TABLE IF NOT EXISTS investigation_sources (
    id TEXT PRIMARY KEY,
    source_json TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    source_type TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()

  await db.prepare(`CREATE TABLE IF NOT EXISTS investigation_timeline_events (
    id TEXT PRIMARY KEY,
    event_json TEXT NOT NULL,
    event_date TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()

  await db.prepare(`CREATE TABLE IF NOT EXISTS records_requests (
    id TEXT PRIMARY KEY,
    request_json TEXT NOT NULL,
    agency TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Drafting',
    date_filed TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()

  await db.prepare(`CREATE TABLE IF NOT EXISTS content_relations (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'related',
    relation_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_content_relations_source ON content_relations(source_type, source_id, relation_type)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_content_relations_target ON content_relations(target_type, target_id)').run()

  await db.prepare(`CREATE TABLE IF NOT EXISTS investigation_revisions (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    revision_json TEXT NOT NULL,
    revision_note TEXT NOT NULL DEFAULT 'save',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_investigation_revisions ON investigation_revisions(investigation_id, created_at DESC)').run()
}

export async function listInvestigations(db, { includeDrafts = false } = {}) {
  await ensureInvestigationTables(db)
  const where = includeDrafts ? '' : "WHERE publication_status = 'published'"
  const result = await db.prepare(`SELECT id, slug, investigation_json, status, publication_status, title, created_at, updated_at
    FROM investigations ${where} ORDER BY updated_at DESC`).all()
  const rows = Array.isArray(result?.results) ? result.results : []
  return Promise.all(rows.map((row) => hydrateInvestigation(db, rowToInvestigation(row))))
}

export async function getInvestigation(db, idOrSlug, { hydrate = true } = {}) {
  await ensureInvestigationTables(db)
  const key = String(idOrSlug || '').trim()
  if (!key) return null
  const row = await db.prepare(`SELECT id, slug, investigation_json, status, publication_status, title, created_at, updated_at
    FROM investigations WHERE id = ? OR slug = ? LIMIT 1`).bind(key, key).first()
  if (!row) return null
  const investigation = rowToInvestigation(row)
  return hydrate ? hydrateInvestigation(db, investigation) : investigation
}

export async function upsertInvestigation(db, incoming) {
  await ensureInvestigationTables(db)
  const normalized = normalizeInvestigation({ ...incoming, updatedAt: new Date().toISOString() })
  const shell = { ...normalized, sources: [], timeline: [], recordsRequests: [], relations: [] }
  await db.prepare(`INSERT INTO investigations
    (id, slug, investigation_json, status, publication_status, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      investigation_json = excluded.investigation_json,
      status = excluded.status,
      publication_status = excluded.publication_status,
      title = excluded.title,
      updated_at = excluded.updated_at`)
    .bind(normalized.id, normalized.slug, JSON.stringify(shell), normalized.status, normalized.publicationStatus,
      normalized.title, normalized.createdAt, normalized.updatedAt).run()

  await syncInvestigationDetails(db, normalized)
  return normalized
}

export async function deleteInvestigation(db, idOrSlug) {
  await ensureInvestigationTables(db)
  const existing = await getInvestigation(db, idOrSlug)
  if (!existing) return null
  await db.prepare("DELETE FROM content_relations WHERE source_type = 'investigation' AND source_id = ?").bind(existing.id).run()
  await db.prepare('DELETE FROM investigation_revisions WHERE investigation_id = ?').bind(existing.id).run()
  await db.prepare('DELETE FROM investigations WHERE id = ?').bind(existing.id).run()
  return existing
}

export async function saveInvestigationRevision(db, investigation, revisionNote = 'save') {
  await ensureInvestigationTables(db)
  const normalized = normalizeInvestigation(investigation)
  const id = `investigation-revision-${randomId()}`
  const createdAt = new Date().toISOString()
  await db.prepare(`INSERT INTO investigation_revisions (id, investigation_id, revision_json, revision_note, created_at)
    VALUES (?, ?, ?, ?, ?)`)
    .bind(id, normalized.id, JSON.stringify(normalized), String(revisionNote || 'save'), createdAt).run()
  return { id, investigationId: normalized.id, revisionNote: String(revisionNote || 'save'), createdAt }
}

async function syncInvestigationDetails(db, investigation) {
  for (const sourceInput of investigation.sources) {
    const source = normalizeSource(sourceInput)
    const now = new Date().toISOString()
    await db.prepare(`INSERT INTO investigation_sources (id, source_json, title, source_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET source_json = excluded.source_json, title = excluded.title,
      source_type = excluded.source_type, updated_at = excluded.updated_at`)
      .bind(source.id, JSON.stringify(source), source.title, source.type, now, now).run()
  }

  for (const eventInput of investigation.timeline) {
    const event = normalizeTimelineEvent(eventInput)
    const now = new Date().toISOString()
    await db.prepare(`INSERT INTO investigation_timeline_events (id, event_json, event_date, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET event_json = excluded.event_json, event_date = excluded.event_date,
      title = excluded.title, updated_at = excluded.updated_at`)
      .bind(event.id, JSON.stringify(event), event.date, event.title, now, now).run()
  }

  for (const requestInput of investigation.recordsRequests) {
    const request = normalizeRecordsRequest(requestInput)
    const now = new Date().toISOString()
    await db.prepare(`INSERT INTO records_requests (id, request_json, agency, status, date_filed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET request_json = excluded.request_json, agency = excluded.agency,
      status = excluded.status, date_filed = excluded.date_filed, updated_at = excluded.updated_at`)
      .bind(request.id, JSON.stringify(request), request.agency, request.status, request.dateFiled, now, now).run()
  }

  await db.prepare("DELETE FROM content_relations WHERE source_type = 'investigation' AND source_id = ?").bind(investigation.id).run()
  const relationRows = [
    ...investigation.sources.map((item) => ({ id: `rel-${investigation.id}-${item.id}`, relationType: 'source', targetType: 'source', targetId: item.id, targetSlug: '', label: item.title, href: '', note: '' })),
    ...investigation.timeline.map((item) => ({ id: `rel-${investigation.id}-${item.id}`, relationType: 'timeline-event', targetType: 'timeline-event', targetId: item.id, targetSlug: '', label: item.title, href: '', note: '' })),
    ...investigation.recordsRequests.map((item) => ({ id: `rel-${investigation.id}-${item.id}`, relationType: 'records-request', targetType: 'records-request', targetId: item.id, targetSlug: '', label: item.title, href: '', note: '' })),
    ...investigation.relations,
  ]
  for (const input of relationRows) {
    const relation = normalizeInvestigationRelation(input)
    await db.prepare(`INSERT INTO content_relations
      (id, source_type, source_id, target_type, target_id, relation_type, relation_json, created_at)
      VALUES (?, 'investigation', ?, ?, ?, ?, ?, ?)`)
      .bind(relation.id, investigation.id, relation.targetType, relation.targetId || relation.targetSlug,
        relation.relationType, JSON.stringify(relation), new Date().toISOString()).run()
  }
}

async function hydrateInvestigation(db, investigation) {
  const result = await db.prepare(`SELECT id, target_type, target_id, relation_type, relation_json
    FROM content_relations WHERE source_type = 'investigation' AND source_id = ? ORDER BY created_at ASC`)
    .bind(investigation.id).all()
  const rows = Array.isArray(result?.results) ? result.results : []
  const sources = []
  const timeline = []
  const recordsRequests = []
  const relations = []

  for (const row of rows) {
    if (row.relation_type === 'source') {
      const item = await db.prepare('SELECT source_json FROM investigation_sources WHERE id = ? LIMIT 1').bind(row.target_id).first()
      if (item?.source_json) sources.push(parseJson(item.source_json, {}))
      continue
    }
    if (row.relation_type === 'timeline-event') {
      const item = await db.prepare('SELECT event_json FROM investigation_timeline_events WHERE id = ? LIMIT 1').bind(row.target_id).first()
      if (item?.event_json) timeline.push(parseJson(item.event_json, {}))
      continue
    }
    if (row.relation_type === 'records-request') {
      const item = await db.prepare('SELECT request_json FROM records_requests WHERE id = ? LIMIT 1').bind(row.target_id).first()
      if (item?.request_json) recordsRequests.push(parseJson(item.request_json, {}))
      continue
    }
    relations.push(normalizeInvestigationRelation(parseJson(row.relation_json, {
      id: row.id, relationType: row.relation_type, targetType: row.target_type, targetId: row.target_id,
    })))
  }

  return normalizeInvestigation({ ...investigation, sources, timeline, recordsRequests, relations })
}

function rowToInvestigation(row) {
  const parsed = parseJson(row.investigation_json, {})
  return normalizeInvestigation({
    ...parsed,
    id: row.id,
    slug: row.slug,
    title: row.title || parsed.title,
    status: row.status || parsed.status,
    publicationStatus: row.publication_status || parsed.publicationStatus,
    createdAt: parsed.createdAt || row.created_at,
    updatedAt: row.updated_at || parsed.updatedAt,
  })
}

function parseJson(value, fallback) {
  try { return JSON.parse(value) } catch { return fallback }
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
