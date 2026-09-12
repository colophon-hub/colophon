export const COVERAGE_EDITORIAL_STATUSES = Object.freeze(['automatic', 'featured', 'hidden'])

const MAX_PAGE_SIZE = 500

export async function ensureCampaignCoverageArchiveTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaign_coverage_archive (
    id TEXT PRIMARY KEY,
    campaign_slug TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    title TEXT NOT NULL,
    translated_title TEXT NOT NULL DEFAULT '',
    outlet TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    published_at TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT '',
    language_code TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    discovery_source TEXT NOT NULL DEFAULT '',
    relevance_score INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    editorial_status TEXT NOT NULL DEFAULT 'automatic',
    reviewed_at TEXT,
    reviewed_by TEXT,
    editorial_note TEXT,
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_slug, canonical_url)
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_coverage_campaign_date ON campaign_coverage_archive(campaign_slug, published_at DESC)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_coverage_campaign_outlet ON campaign_coverage_archive(campaign_slug, outlet)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_coverage_campaign_language ON campaign_coverage_archive(campaign_slug, language_code)').run()

  const columns = await coverageColumnNames(db)
  let schemaChanged = false
  for (const [name, definition] of [
    ['editorial_status', "TEXT NOT NULL DEFAULT 'automatic'"],
    ['reviewed_at', 'TEXT'],
    ['reviewed_by', 'TEXT'],
    ['editorial_note', 'TEXT'],
  ]) {
    if (columns.has(name)) continue
    await db.prepare(`ALTER TABLE campaign_coverage_archive ADD COLUMN ${name} ${definition}`).run()
    schemaChanged = true
  }

  await db.prepare("UPDATE campaign_coverage_archive SET editorial_status = 'automatic' WHERE editorial_status IS NULL OR editorial_status NOT IN ('automatic', 'featured', 'hidden')").run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_coverage_campaign_editorial ON campaign_coverage_archive(campaign_slug, editorial_status, published_at DESC)').run()
  if (schemaChanged) await canonicalizeExistingCoverage(db)
}

export async function upsertCampaignCoverageItems(db, items = [], { campaignSlug, source = '' } = {}) {
  const normalizedSlug = cleanText(campaignSlug)
  if (!normalizedSlug) throw new Error('campaign slug is required')
  await ensureCampaignCoverageArchiveTables(db)
  let saved = 0
  for (const raw of dedupeArchiveItems(items)) {
    const item = normalizeArchiveItem(raw, { campaignSlug: normalizedSlug, source })
    if (!item) continue
    await db.prepare(`INSERT INTO campaign_coverage_archive (
      id, campaign_slug, canonical_url, title, translated_title, outlet, summary,
      published_at, language, language_code, image_url, discovery_source,
      relevance_score, is_featured, status, editorial_status, first_seen_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
    ON CONFLICT(campaign_slug, canonical_url) DO UPDATE SET
      title = excluded.title,
      translated_title = CASE WHEN excluded.translated_title != '' THEN excluded.translated_title ELSE translated_title END,
      outlet = CASE WHEN excluded.outlet != '' THEN excluded.outlet ELSE outlet END,
      summary = CASE WHEN excluded.summary != '' THEN excluded.summary ELSE summary END,
      published_at = CASE WHEN excluded.published_at != '' THEN excluded.published_at ELSE published_at END,
      language = CASE WHEN excluded.language != '' THEN excluded.language ELSE language END,
      language_code = CASE WHEN excluded.language_code != '' THEN excluded.language_code ELSE language_code END,
      image_url = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE image_url END,
      discovery_source = CASE WHEN discovery_source != '' THEN discovery_source ELSE excluded.discovery_source END,
      relevance_score = MAX(relevance_score, excluded.relevance_score),
      is_featured = MAX(is_featured, excluded.is_featured),
      last_seen_at = excluded.last_seen_at`)
      .bind(
        item.id, item.campaignSlug, item.url, item.title, item.translatedTitle, item.outlet,
        item.summary, item.date, item.language, item.languageCode, item.imageUrl,
        item.discoverySource, item.relevanceScore, item.isFeatured ? 1 : 0,
        item.editorialStatus, item.firstSeenAt, item.lastSeenAt,
      ).run()
    saved += 1
  }
  return saved
}

export async function listCampaignCoverageArchive(db, options = {}) {
  await ensureCampaignCoverageArchiveTables(db)
  const campaignSlug = cleanText(options.campaignSlug)
  if (!campaignSlug) throw new Error('campaign slug is required')
  const page = clampInt(options.page, 1, 100000, 1)
  const limit = clampInt(options.limit, 1, MAX_PAGE_SIZE, 24)
  const q = cleanText(options.q).slice(0, 160)
  const language = cleanText(options.language).slice(0, 20).toLowerCase()
  const outlet = cleanText(options.outlet).slice(0, 120)
  const includeHidden = options.includeHidden === true
  const editorialStatus = cleanText(options.editorialStatus).toLowerCase()
  if (editorialStatus && editorialStatus !== 'all' && !COVERAGE_EDITORIAL_STATUSES.includes(editorialStatus)) throw new Error('invalid editorial status')

  const clauses = ["campaign_slug = ?", "status = 'published'"]
  const values = [campaignSlug]
  if (editorialStatus && editorialStatus !== 'all') {
    clauses.push('editorial_status = ?')
    values.push(editorialStatus)
  } else if (!includeHidden) {
    clauses.push("editorial_status != 'hidden'")
  }
  if (q) {
    clauses.push("(lower(title) LIKE ? ESCAPE '\\' OR lower(translated_title) LIKE ? ESCAPE '\\' OR lower(outlet) LIKE ? ESCAPE '\\' OR lower(summary) LIKE ? ESCAPE '\\')")
    const term = `%${escapeLike(q.toLowerCase())}%`
    values.push(term, term, term, term)
  }
  if (language) {
    clauses.push('lower(language_code) = ?')
    values.push(language)
  }
  if (outlet) {
    clauses.push('outlet = ?')
    values.push(outlet)
  }

  const where = `WHERE ${clauses.join(' AND ')}`
  const countRow = await db.prepare(`SELECT COUNT(*) AS total FROM campaign_coverage_archive ${where}`).bind(...values).first()
  const result = await db.prepare(`SELECT * FROM campaign_coverage_archive ${where}
    ORDER BY CASE editorial_status WHEN 'featured' THEN 0 WHEN 'automatic' THEN 1 ELSE 2 END, published_at DESC, relevance_score DESC, outlet ASC
    LIMIT ? OFFSET ?`).bind(...values, limit, (page - 1) * limit).all()
  const rows = Array.isArray(result?.results) ? result.results : []
  const total = Number(countRow?.total || 0)
  return { items: rows.map((row) => rowToArchiveItem(row, { includePrivate: includeHidden })), page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
}

export async function getCampaignCoverageArchiveSummary(db, campaignSlug, { includeHidden = false } = {}) {
  await ensureCampaignCoverageArchiveTables(db)
  const normalizedSlug = cleanText(campaignSlug)
  if (!normalizedSlug) throw new Error('campaign slug is required')
  const visibility = includeHidden ? '' : " AND editorial_status != 'hidden'"
  const [count, languages, outlets] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total, MAX(last_seen_at) AS last_updated_at FROM campaign_coverage_archive WHERE campaign_slug = ? AND status = 'published'${visibility}`).bind(normalizedSlug).first(),
    db.prepare(`SELECT language_code, language, COUNT(*) AS count FROM campaign_coverage_archive WHERE campaign_slug = ? AND status = 'published'${visibility} GROUP BY language_code, language ORDER BY count DESC, language ASC`).bind(normalizedSlug).all(),
    db.prepare(`SELECT outlet, COUNT(*) AS count FROM campaign_coverage_archive WHERE campaign_slug = ? AND status = 'published' AND outlet != ''${visibility} GROUP BY outlet ORDER BY count DESC, outlet ASC`).bind(normalizedSlug).all(),
  ])
  return {
    total: Number(count?.total || 0),
    lastUpdatedAt: String(count?.last_updated_at || ''),
    languages: (languages?.results || []).map((row) => ({ code: String(row.language_code || ''), label: String(row.language || row.language_code || 'Unlabeled'), count: Number(row.count || 0) })),
    outlets: (outlets?.results || []).map((row) => ({ label: String(row.outlet || ''), count: Number(row.count || 0) })),
  }
}

export async function updateCoverageEditorialState(db, { id, campaignSlug, editorialStatus, editorialNote, actor }) {
  await ensureCampaignCoverageArchiveTables(db)
  const status = cleanText(editorialStatus).toLowerCase()
  if (!COVERAGE_EDITORIAL_STATUSES.includes(status)) throw new Error('invalid editorial status')
  const reviewedAt = new Date().toISOString()
  const note = editorialNote == null ? null : String(editorialNote).trim().slice(0, 4000)
  const result = await db.prepare(`UPDATE campaign_coverage_archive
    SET editorial_status = ?, editorial_note = ?, reviewed_at = ?, reviewed_by = ?
    WHERE id = ? AND campaign_slug = ?`)
    .bind(status, note || null, reviewedAt, cleanText(actor || 'unknown').slice(0, 160), cleanText(id), cleanText(campaignSlug)).run()
  if (!Number(result?.meta?.changes || 0)) return null
  const row = await db.prepare('SELECT * FROM campaign_coverage_archive WHERE id = ? AND campaign_slug = ? LIMIT 1').bind(cleanText(id), cleanText(campaignSlug)).first()
  return row ? rowToArchiveItem(row, { includePrivate: true }) : null
}

export function normalizeArchiveItem(raw = {}, { campaignSlug, source = '' } = {}) {
  const normalizedSlug = cleanText(campaignSlug)
  const url = canonicalCoverageUrl(raw.url || raw.href)
  const title = cleanText(raw.title)
  if (!normalizedSlug || !url || !title) return null
  const now = new Date().toISOString()
  const moderation = cleanText(raw.editorialStatus || raw.moderationStatus || raw.moderation).toLowerCase()
  const editorialStatus = COVERAGE_EDITORIAL_STATUSES.includes(moderation)
    ? moderation
    : (raw.featured === true || raw.isFeatured === true ? 'featured' : 'automatic')
  return {
    id: `coverage-${stableId(`${normalizedSlug}:${url}`)}`,
    campaignSlug: normalizedSlug,
    url,
    title,
    translatedTitle: cleanText(raw.translatedTitle),
    outlet: cleanText(raw.outlet || raw.publisher),
    summary: cleanText(raw.summary || raw.description).slice(0, 600),
    date: normalizeDate(raw.date || raw.publishedAt),
    language: normalizeLanguage(raw.language),
    languageCode: cleanText(raw.languageCode).toLowerCase() || languageCode(raw.language),
    imageUrl: safeHttpUrl(raw.imageUrl),
    discoverySource: cleanText(raw.discoverySource || source || (raw.automated === true ? 'campaign-automation' : 'campaign')),
    relevanceScore: Number.isFinite(Number(raw.relevanceScore)) ? Number(raw.relevanceScore) : 0,
    isFeatured: editorialStatus === 'featured',
    editorialStatus,
    firstSeenAt: now,
    lastSeenAt: now,
  }
}

export function canonicalCoverageUrl(value) {
  try {
    const url = new URL(String(value || ''))
    if (!/^https?:$/.test(url.protocol)) return ''
    url.protocol = url.protocol.toLowerCase()
    url.hostname = url.hostname.toLowerCase()
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|vero_id|yclid|_hsenc|_hsmi|google_vignette|ref|ref_src|ref_url|spm|campaign|campaign_id)$/i.test(key)) url.searchParams.delete(key)
    }
    url.searchParams.sort()
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

function rowToArchiveItem(row = {}, { includePrivate = false } = {}) {
  const item = {
    id: String(row.id || ''),
    date: String(row.published_at || ''),
    outlet: String(row.outlet || ''),
    language: String(row.language || ''),
    languageCode: String(row.language_code || ''),
    title: String(row.title || ''),
    translatedTitle: String(row.translated_title || ''),
    url: String(row.canonical_url || ''),
    imageUrl: String(row.image_url || ''),
    summary: String(row.summary || ''),
    discoverySource: String(row.discovery_source || ''),
    relevanceScore: Number(row.relevance_score || 0),
    featured: Number(row.is_featured || 0) === 1,
    editorialStatus: validEditorialStatus(row.editorial_status),
  }
  if (includePrivate) {
    item.reviewedAt = String(row.reviewed_at || '')
    item.reviewedBy = String(row.reviewed_by || '')
    item.editorialNote = String(row.editorial_note || '')
  }
  return item
}

function dedupeArchiveItems(items) {
  const seen = new Set()
  return (Array.isArray(items) ? items : []).filter((item) => {
    const url = canonicalCoverageUrl(item?.url || item?.href)
    if (!url || seen.has(url)) return false
    seen.add(url)
    return true
  })
}

function safeHttpUrl(value) { return canonicalCoverageUrl(value) }
function cleanText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => safeCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => safeCodePoint(Number.parseInt(code, 10)))
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}
function safeCodePoint(value) { try { return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '' } catch { return '' } }
function normalizeDate(value) { const time = new Date(value || 0).getTime(); return Number.isFinite(time) ? new Date(time).toISOString() : '' }
function normalizeLanguage(value) { const text = cleanText(value); if (/^it(?:alian|aliano)?$/i.test(text)) return 'Italian'; if (/^en(?:glish)?$/i.test(text)) return 'English'; return text }
function languageCode(value) { const text = cleanText(value); if (/^it(?:alian|aliano)?$/i.test(text)) return 'it'; if (/^en(?:glish)?$/i.test(text)) return 'en'; return '' }
function stableId(value) { let hash = 2166136261; for (const char of String(value || '')) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619) } return (hash >>> 0).toString(36) }
function clampInt(value, min, max, fallback) { const number = Number.parseInt(value, 10); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback }
function escapeLike(value) { return String(value || '').replace(/[\\%_]/g, '\\$&') }
function validEditorialStatus(value) { return COVERAGE_EDITORIAL_STATUSES.includes(String(value || '')) ? String(value) : 'automatic' }
function editorialPriority(value) { return value === 'hidden' ? 3 : value === 'featured' ? 2 : 1 }

async function coverageColumnNames(db) {
  const result = await db.prepare('PRAGMA table_info(campaign_coverage_archive)').all()
  return new Set((result?.results || []).map((row) => String(row.name || '')))
}

async function canonicalizeExistingCoverage(db) {
  const result = await db.prepare('SELECT id, campaign_slug, canonical_url, editorial_status, reviewed_at, reviewed_by, editorial_note FROM campaign_coverage_archive').all()
  const rows = Array.isArray(result?.results) ? result.results : []
  const groups = new Map()
  for (const row of rows) {
    const canonical = canonicalCoverageUrl(row.canonical_url)
    if (!canonical) continue
    const key = `${row.campaign_slug}:${canonical}`
    const group = groups.get(key) || []
    group.push({ ...row, canonical })
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    const survivor = [...group].sort((a, b) => editorialPriority(b.editorial_status) - editorialPriority(a.editorial_status))[0]
    const decision = [...group].sort((a, b) => editorialPriority(b.editorial_status) - editorialPriority(a.editorial_status))[0]
    for (const duplicate of group) {
      if (duplicate.id !== survivor.id) await db.prepare('DELETE FROM campaign_coverage_archive WHERE id = ?').bind(duplicate.id).run()
    }
    await db.prepare(`UPDATE campaign_coverage_archive SET canonical_url = ?, editorial_status = ?, reviewed_at = ?, reviewed_by = ?, editorial_note = ? WHERE id = ?`)
      .bind(survivor.canonical, validEditorialStatus(decision.editorial_status), decision.reviewed_at || null, decision.reviewed_by || null, decision.editorial_note || null, survivor.id).run()
  }
}
