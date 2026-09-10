const GENERIC_PROJECT_KEYS = new Set([
  '', 'general', 'podcast', 'podcasts', 'article', 'articles', 'post', 'posts',
  'comic', 'comics', 'zine', 'zines', 'newsletter', 'newsletters', 'print', 'audio',
])

export const PUBLICATION_IDENTITY = { name: 'Example Publication', logoUrl: '' }
export const PUBLIC_PROJECTS = []

export function normalizeProjectKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[’‘]/g, "'")
    .replace(/[.!?]+$/g, '').replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function toProjectSlug(value) {
  return normalizeProjectKey(value).replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isGenericProject(value) { return GENERIC_PROJECT_KEYS.has(normalizeProjectKey(value)) }

export function findPublicProject(value) {
  const key = normalizeProjectKey(value)
  if (!key) return null
  return PUBLIC_PROJECTS.find((project) => {
    const aliases = [project.name, project.slug, ...(project.aliases || [])].map(normalizeProjectKey)
    return aliases.includes(key) || project.slug === toProjectSlug(value)
  }) || null
}

function candidateValues(piece) {
  return [piece?.primaryProject, piece?.primaryProjectSlug, piece?.project, piece?.projectName, ...(piece?.projects || [])]
    .map((value) => value && typeof value === 'object' ? (value.name || value.title || value.slug || '') : value)
    .map((value) => String(value || '').trim()).filter(Boolean)
}

export function fallbackProjectForType(type) {
  const normalized = String(type || 'article').toLowerCase()
  const format = ['podcast', 'audio'].includes(normalized) ? 'podcast'
    : ['zine', 'print'].includes(normalized) ? 'print'
      : ['comic', 'comics'].includes(normalized) ? 'comic'
        : ['newsletter', 'newsletters'].includes(normalized) ? 'newsletter' : 'article'
  return { name: 'General', slug: 'general', format, featured: false, aliases: [], signals: [], description: 'General publication archive.', logoUrl: '', dynamic: true }
}

export function resolveArchiveProject(piece, type = 'article') {
  const candidates = candidateValues(piece)
  for (const candidate of candidates) {
    const known = findPublicProject(candidate)
    if (known) return known
  }
  const explicit = candidates.find((candidate) => !isGenericProject(candidate))
  if (explicit) return { name: explicit, slug: toProjectSlug(explicit), format: String(type || 'project'), featured: false, aliases: [], signals: [], description: 'Archive project.', logoUrl: '', dynamic: true }
  return fallbackProjectForType(type)
}

export function buildArchiveProjectOptions(items = []) {
  const counts = new Map()
  const dynamic = new Map()
  for (const item of items) {
    const project = item?.projectMeta || resolveArchiveProject(item, item?.type)
    if (!project?.slug) continue
    counts.set(project.slug, (counts.get(project.slug) || 0) + 1)
    if (project.dynamic) dynamic.set(project.slug, project)
  }
  const known = PUBLIC_PROJECTS.filter((project) => counts.has(project.slug))
    .map((project) => ({ ...project, count: counts.get(project.slug) || 0 }))
  const extras = [...dynamic.values()].filter((project) => counts.has(project.slug))
    .map((project) => ({ ...project, count: counts.get(project.slug) || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...known, ...extras]
}

export function getFeaturedPublicProjects() { return PUBLIC_PROJECTS.filter((project) => project.featured) }
