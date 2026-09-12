export const EDITORIAL_STATES = Object.freeze([
  'draft',
  'in_review',
  'needs_revision',
  'ready',
  'declined',
  'scheduled',
  'published',
  'archived',
  'trash',
])

const CONTRIBUTOR_EDITABLE_STATES = new Set(['draft', 'in_review', 'needs_revision'])
const CONTRIBUTOR_SETTABLE_STATES = new Set(['draft', 'in_review', 'needs_revision'])

export function hasCapability(permission, capability) {
  const capabilities = Array.isArray(permission?.capabilities) ? permission.capabilities : []
  return Boolean(permission?.canAccessAdmin && (capabilities.includes('*') || capabilities.includes(capability)))
}

export function isContributor(permission) {
  return String(permission?.role || '') === 'contributor'
}

export function accountIdForPermission(permission) {
  return String(permission?.user?.id || '')
}

export function isOwnedBy(entry, permission) {
  const ownerId = String(entry?.ownerAccountId || entry?.owner_account_id || '')
  const userId = accountIdForPermission(permission)
  return Boolean(ownerId && userId && ownerId === userId)
}

export function canReadPrivateEntry(permission, entry) {
  if (hasCapability(permission, 'review:manage') || hasCapability(permission, 'publishing:write')) return true
  if (!hasCapability(permission, 'content:write')) return false
  return isOwnedBy(entry, permission)
}

export function canEditEntry(permission, entry) {
  if (hasCapability(permission, 'review:manage') || hasCapability(permission, 'publishing:write')) return true
  if (!hasCapability(permission, 'content:write') || !isOwnedBy(entry, permission)) return false
  if (['published', 'scheduled'].includes(String(entry?.status || ''))) return false
  return CONTRIBUTOR_EDITABLE_STATES.has(String(entry?.workflowState || 'draft'))
}

export function prepareEntryForWrite(permission, existing, requested = {}) {
  if (!hasCapability(permission, 'content:write')) throw new Error('content:write permission required')

  const next = { ...(requested || {}) }
  const userId = accountIdForPermission(permission)
  const actor = String(permission?.actor || permission?.user?.email || userId || '')

  if (!existing) {
    if (userId && !next.ownerAccountId) next.ownerAccountId = userId
    if (actor && !next.ownerEmail) next.ownerEmail = actor
  } else {
    if (!canEditEntry(permission, existing)) throw new Error('you do not have permission to edit this content')
    next.ownerAccountId = existing.ownerAccountId || next.ownerAccountId || ''
    next.ownerEmail = existing.ownerEmail || next.ownerEmail || ''
  }

  if (isContributor(permission)) {
    if (!userId) throw new Error('contributor account identity is required')
    const ownerId = String(next.ownerAccountId || '')
    if (ownerId && ownerId !== userId) throw new Error('contributors cannot change content ownership')
    next.ownerAccountId = userId
    next.ownerEmail = actor

    const requestedStatus = String(next.status || existing?.status || 'draft')
    const requestedWorkflow = String(next.workflowState || existing?.workflowState || 'draft')
    if (requestedStatus !== 'draft') throw new Error('contributors cannot publish, schedule, archive, or trash content')
    if (!CONTRIBUTOR_SETTABLE_STATES.has(requestedWorkflow)) {
      throw new Error(`contributors cannot move content to ${requestedWorkflow}`)
    }
    if (requestedWorkflow === 'needs_revision' && String(existing?.workflowState || '') !== 'needs_revision') {
      throw new Error('only an editor can request revisions')
    }
    next.status = 'draft'
    next.workflowState = requestedWorkflow
    next.publishedAt = ''
    next.scheduledFor = ''
  } else {
    const nextStatus = String(next.status || existing?.status || 'draft')
    const nextWorkflow = String(next.workflowState || existing?.workflowState || 'draft')
    if (['published', 'scheduled'].includes(nextStatus) || ['published', 'scheduled'].includes(nextWorkflow)) {
      if (!hasCapability(permission, 'publishing:write')) throw new Error('publishing:write permission required')
    }
    if (['ready', 'declined', 'needs_revision'].includes(nextWorkflow) && !hasCapability(permission, 'review:manage')) {
      throw new Error('review:manage permission required')
    }
  }

  return next
}

export function applyReviewAction(permission, entry, action, options = {}) {
  const normalizedAction = String(action || '').trim().toLowerCase()
  const now = new Date().toISOString()
  const actor = String(permission?.actor || permission?.user?.email || accountIdForPermission(permission) || 'editor')

  if (normalizedAction === 'submit' || normalizedAction === 'resubmit') {
    if (!hasCapability(permission, 'content:write')) throw new Error('content:write permission required')
    if (isContributor(permission) && !isOwnedBy(entry, permission)) throw new Error('contributors can only submit their own work')
    const current = String(entry?.workflowState || 'draft')
    if (!['draft', 'needs_revision', 'in_review'].includes(current)) throw new Error(`cannot submit content from ${current}`)
    return {
      ...entry,
      status: 'draft',
      workflowState: 'in_review',
      submittedAt: now,
      reviewedAt: '',
      reviewedBy: '',
      declinedAt: '',
      declinedBy: '',
      scheduledFor: '',
      publishedAt: '',
    }
  }

  if (!hasCapability(permission, 'review:manage')) throw new Error('review:manage permission required')

  if (normalizedAction === 'request_changes') {
    return { ...entry, status: 'draft', workflowState: 'needs_revision', reviewedAt: now, reviewedBy: actor, scheduledFor: '', publishedAt: '' }
  }
  if (normalizedAction === 'approve') {
    return { ...entry, status: 'draft', workflowState: 'ready', reviewedAt: now, reviewedBy: actor, declinedAt: '', declinedBy: '', scheduledFor: '', publishedAt: '' }
  }
  if (normalizedAction === 'decline') {
    return { ...entry, status: 'draft', workflowState: 'declined', reviewedAt: now, reviewedBy: actor, declinedAt: now, declinedBy: actor, scheduledFor: '', publishedAt: '' }
  }
  if (normalizedAction === 'publish') {
    if (!hasCapability(permission, 'publishing:write')) throw new Error('publishing:write permission required')
    if (String(entry?.workflowState || '') !== 'ready') throw new Error('content must be ready before publishing')
    return { ...entry, status: 'published', workflowState: 'published', reviewedAt: entry.reviewedAt || now, reviewedBy: entry.reviewedBy || actor, publishedAt: now, scheduledFor: '' }
  }
  if (normalizedAction === 'schedule') {
    if (!hasCapability(permission, 'publishing:write')) throw new Error('publishing:write permission required')
    if (String(entry?.workflowState || '') !== 'ready') throw new Error('content must be ready before scheduling')
    const scheduledFor = normalizeFutureDate(options.scheduledFor)
    return { ...entry, status: 'scheduled', workflowState: 'scheduled', reviewedAt: entry.reviewedAt || now, reviewedBy: entry.reviewedBy || actor, scheduledFor, publishedAt: '' }
  }

  throw new Error(`unknown review action: ${normalizedAction || '(empty)'}`)
}

export function canCommentOnEntry(permission, entry) {
  if (!hasCapability(permission, 'review:comment')) return false
  if (hasCapability(permission, 'review:manage')) return true
  return isOwnedBy(entry, permission)
}

export function appendEditorialComment(entry, permission, body, kind = 'comment') {
  if (!canCommentOnEntry(permission, entry)) throw new Error('you do not have permission to comment on this content')
  const text = String(body || '').trim()
  if (!text) throw new Error('comment body is required')
  if (text.length > 10000) throw new Error('comment is too long')
  const now = new Date().toISOString()
  const user = permission?.user || {}
  const comment = {
    id: `comment-${crypto.randomUUID?.() || Math.random().toString(36).slice(2, 12)}`,
    kind: String(kind || 'comment').slice(0, 40),
    body: text,
    authorAccountId: String(user.id || ''),
    authorName: String(user.displayName || user.email || permission?.actor || 'user'),
    authorRole: String(permission?.role || ''),
    createdAt: now,
  }
  return { ...entry, editorialComments: [...normalizeComments(entry?.editorialComments), comment] }
}

export function normalizeComments(value) {
  return (Array.isArray(value) ? value : []).map((item) => ({
    id: String(item?.id || ''),
    kind: String(item?.kind || 'comment'),
    body: String(item?.body || ''),
    authorAccountId: String(item?.authorAccountId || ''),
    authorName: String(item?.authorName || ''),
    authorRole: String(item?.authorRole || ''),
    createdAt: String(item?.createdAt || ''),
  })).filter((item) => item.id && item.body)
}

function normalizeFutureDate(value) {
  const date = new Date(String(value || ''))
  if (!Number.isFinite(date.getTime())) throw new Error('a valid schedule date is required')
  if (date.getTime() <= Date.now()) throw new Error('schedule date must be in the future')
  return date.toISOString()
}
