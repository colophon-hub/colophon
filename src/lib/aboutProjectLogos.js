function normalizeLogoIdentity(value) {
  return String(value || '').trim().toLowerCase().replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function findMediaProjectLogo(project, assets = []) {
  if (!project?.slug || !Array.isArray(assets)) return ''
  const projectName = normalizeLogoIdentity(project.name)
  const projectSlug = normalizeLogoIdentity(project.slug)
  const accepted = new Set([projectName, projectSlug, `${projectName} logo`, `${projectName} project logo`])
  const match = assets.find((asset) => {
    if (!asset?.url) return false
    const title = normalizeLogoIdentity(asset.title)
    const filename = normalizeLogoIdentity(asset.filename)
    const tags = Array.isArray(asset.tags) ? asset.tags.map(normalizeLogoIdentity) : []
    return accepted.has(title) || accepted.has(filename) || (tags.includes('project logo') && (tags.includes(projectName) || tags.includes(projectSlug)))
  })
  return String(match?.url || '')
}

export function getAboutProjectLogo(project) { return project?.logoUrl || '' }
