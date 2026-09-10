import { localDelete, localList, localSet } from './browserLocalDb'
import { isBrowserLocalRuntime } from './runtime'
import { normalizeInvestigation } from '../../shared/investigationModel.js'

async function safeJson(response) {
  try { return await response.json() } catch { return null }
}

function localKey(id) { return `investigation:${id}` }
function revisionKey(investigationId, revisionId) { return `investigation-revision:${investigationId}:${revisionId}` }
function makeRevisionId() {
  if (globalThis.crypto?.randomUUID) return `investigation-revision-${crypto.randomUUID()}`
  return `investigation-revision-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function loadInvestigations({ includeDrafts = false } = {}) {
  if (isBrowserLocalRuntime()) {
    const items = (await localList('investigation:')).map(normalizeInvestigation)
      .filter((item) => includeDrafts || item.publicationStatus === 'published')
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    return items
  }
  const params = new URLSearchParams()
  if (includeDrafts) params.set('includeDrafts', '1')
  const response = await fetch(`/api/investigations${params.size ? `?${params}` : ''}`, {
    method: 'GET', credentials: 'same-origin', headers: { accept: 'application/json' },
  })
  const data = await safeJson(response)
  if (!response.ok || !data?.ok || !Array.isArray(data.items)) throw new Error(data?.error || `investigation list failed: ${response.status}`)
  return data.items.map(normalizeInvestigation)
}

export async function loadInvestigation(slug, { includeDrafts = false } = {}) {
  const key = String(slug || '').trim()
  if (!key) throw new Error('investigation slug is required')
  if (isBrowserLocalRuntime()) {
    const items = await localList('investigation:')
    const match = items.find((item) => String(item.slug) === key || String(item.id) === key)
    if (!match || (!includeDrafts && match.publicationStatus !== 'published')) throw new Error('investigation not found')
    return normalizeInvestigation(match)
  }
  const params = new URLSearchParams({ slug: key })
  if (includeDrafts) params.set('includeDrafts', '1')
  const response = await fetch(`/api/investigations?${params}`, {
    method: 'GET', credentials: 'same-origin', headers: { accept: 'application/json' },
  })
  const data = await safeJson(response)
  if (!response.ok || !data?.ok || !data?.item) throw new Error(data?.error || `investigation load failed: ${response.status}`)
  return normalizeInvestigation(data.item)
}

export async function saveInvestigation(input, revisionNote = 'save') {
  const now = new Date().toISOString()
  const item = normalizeInvestigation({ ...input, updatedAt: now })
  if (!item.title || !item.slug) throw new Error('Investigation title and slug are required.')
  if (isBrowserLocalRuntime()) {
    const existing = (await localList('investigation:')).find((entry) => entry.id === item.id)
    if (existing) {
      const revisionId = makeRevisionId()
      await localSet(revisionKey(item.id, revisionId), {
        id: revisionId, investigationId: item.id, snapshot: normalizeInvestigation(existing), revisionNote: 'before:save', createdAt: now,
      })
    }
    await localSet(localKey(item.id), item)
    const revisionId = makeRevisionId()
    await localSet(revisionKey(item.id, revisionId), {
      id: revisionId, investigationId: item.id, snapshot: item, revisionNote: String(revisionNote || 'save'), createdAt: now,
    })
    return item
  }
  const response = await fetch('/api/investigations', {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ item, revisionNote }),
  })
  const data = await safeJson(response)
  if (!response.ok || !data?.ok || !data?.item) throw new Error(data?.error || `investigation save failed: ${response.status}`)
  return normalizeInvestigation(data.item)
}

export async function deleteInvestigation(id) {
  const key = String(id || '').trim()
  if (!key) throw new Error('investigation id is required')
  if (isBrowserLocalRuntime()) {
    await localDelete(localKey(key))
    const revisions = await localList(`investigation-revision:${key}:`)
    for (const revision of revisions) await localDelete(revisionKey(key, revision.id))
    return { id: key }
  }
  const response = await fetch('/api/investigations', {
    method: 'DELETE', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ id: key }),
  })
  const data = await safeJson(response)
  if (!response.ok || !data?.ok) throw new Error(data?.error || `investigation delete failed: ${response.status}`)
  return data.removed
}
