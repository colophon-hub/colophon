export const COURSE_SCHEMA_VERSION = 1
export const COURSE_STATUSES = ['draft', 'review', 'published', 'archived']

export function slugifyCourse(value = '') {
  return String(value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'course'
}

export function normalizeCourse(input = {}) {
  const now = new Date().toISOString()
  const id = clean(input.id || input.slug || cryptoId(), 180)
  const slug = slugifyCourse(input.slug || input.title || id)
  const sections = (Array.isArray(input.sections) ? input.sections : []).map((section, si) => normalizeSection(section, si))
    .sort((a,b) => a.order-b.order)
  const lessonIds = new Set(sections.flatMap((s) => s.lessons.map((l) => l.id)))
  for (const section of sections) for (const lesson of section.lessons) lesson.prerequisites = lesson.prerequisites.filter((id) => lessonIds.has(id) && id !== lesson.id)
  const status = COURSE_STATUSES.includes(input.status) ? input.status : 'draft'
  return {
    schemaVersion: COURSE_SCHEMA_VERSION,
    id, slug,
    title: clean(input.title, 220),
    summary: clean(input.summary, 1000),
    description: String(input.description || '').slice(0, 20000),
    status,
    revision: Math.max(0, Number(input.revision || 0)),
    publishedVersion: Math.max(0, Number(input.publishedVersion || 0)),
    estimatedMinutes: Math.max(0, Number(input.estimatedMinutes || sections.flatMap(s=>s.lessons).reduce((n,l)=>n+l.estimatedMinutes,0))),
    authors: cleanList(input.authors, 20, 180),
    contributors: cleanList(input.contributors, 100, 180),
    reviewers: cleanList(input.reviewers, 100, 180),
    reviewNotes: clean(input.reviewNotes, 5000),
    sections,
    createdAt: clean(input.createdAt || now, 80),
    updatedAt: clean(input.updatedAt || now, 80),
    publishedAt: status === 'published' ? clean(input.publishedAt || now, 80) : clean(input.publishedAt, 80),
  }
}

export function publicCourse(input = {}) {
  const course = normalizeCourse(input)
  if (course.status !== 'published') return null
  const { reviewNotes, contributors, reviewers, revision, ...safe } = course
  return safe
}

export function normalizeSection(input = {}, index = 0) {
  return {
    id: clean(input.id || `section-${index+1}`, 120),
    title: clean(input.title || `Section ${index+1}`, 220),
    summary: clean(input.summary, 1000),
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : index,
    lessons: (Array.isArray(input.lessons) ? input.lessons : []).map((lesson, li) => normalizeLesson(lesson, li)).sort((a,b)=>a.order-b.order),
  }
}

export function normalizeLesson(input = {}, index = 0) {
  const id = clean(input.id || `lesson-${index+1}`, 120)
  const activities = (Array.isArray(input.activities) ? input.activities : []).map((activity, ai) => ({
    id: clean(activity.id || `${id}-activity-${ai+1}`, 120),
    type: ['check','reflection','exercise','quiz'].includes(activity.type) ? activity.type : 'exercise',
    title: clean(activity.title || `Activity ${ai+1}`, 220),
    prompt: String(activity.prompt || '').slice(0, 10000),
    required: activity.required !== false,
  }))
  return {
    id,
    title: clean(input.title || `Lesson ${index+1}`, 220),
    summary: clean(input.summary, 1000),
    bodyHtml: String(input.bodyHtml || input.body || '').slice(0, 200000),
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : index,
    estimatedMinutes: Math.max(0, Number(input.estimatedMinutes || 0)),
    difficulty: ['intro','beginner','intermediate','advanced'].includes(input.difficulty) ? input.difficulty : 'beginner',
    prerequisites: cleanList(input.prerequisites, 100, 120),
    completionRule: input.completionRule === 'activities' ? 'activities' : 'manual',
    activities,
    resources: (Array.isArray(input.resources) ? input.resources : []).slice(0,100).map((r)=>({ title: clean(r.title,220), url: safeUrl(r.url), note: clean(r.note,1000) })).filter(r=>r.title||r.url),
  }
}

export function lessonSequence(course) {
  return normalizeCourse(course).sections.flatMap((section) => section.lessons.map((lesson) => ({...lesson, sectionId: section.id, sectionTitle: section.title})))
}

export function lessonUnlocked(course, lessonId, completedIds = []) {
  const lesson = lessonSequence(course).find((item) => item.id === lessonId)
  if (!lesson) return false
  const done = new Set(completedIds)
  return lesson.prerequisites.every((id)=>done.has(id))
}

export function courseProgressSummary(course, progress = {}) {
  const lessons = lessonSequence(course)
  const completed = new Set(Array.isArray(progress.completedLessons) ? progress.completedLessons : [])
  return { total: lessons.length, completed: lessons.filter((l)=>completed.has(l.id)).length, percent: lessons.length ? Math.round((lessons.filter((l)=>completed.has(l.id)).length/lessons.length)*100) : 0 }
}

function clean(value,max){ return String(value || '').trim().slice(0,max) }
function cleanList(value,maxItems,maxLen){ return [...new Set((Array.isArray(value)?value:[]).map(v=>clean(v,maxLen)).filter(Boolean))].slice(0,maxItems) }
function safeUrl(value){ try { const u=new URL(String(value||'')); return ['http:','https:'].includes(u.protocol)?u.toString():'' } catch { return '' } }
function cryptoId(){ return globalThis.crypto?.randomUUID?.() || `course-${Math.random().toString(36).slice(2,10)}` }
