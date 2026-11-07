/** Course/lesson URL slug: lowercase alphanumeric + hyphens, 3–80 chars. */
export const COURSE_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

export function slugifyCourseTitle(raw: string, fallback = 'course'): string {
  const base = raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  return base || fallback
}

export function isValidCourseSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 80) return false
  if (slug.includes('--')) return false
  return COURSE_SLUG_REGEX.test(slug)
}

export function buildLessonSlugCandidate(title: string, lessonId: string): string {
  const base = slugifyCourseTitle(title, 'lesson')
  const suffix = lessonId.replace(/-/g, '').slice(0, 8)
  const trimmed = base.slice(0, Math.max(3, 80 - 9))
  return `${trimmed}-${suffix}`
}

export function buildCourseSlugCandidate(title: string, courseId: string): string {
  const base = slugifyCourseTitle(title, 'course')
  const suffix = courseId.replace(/-/g, '').slice(0, 8)
  const trimmed = base.slice(0, Math.max(3, 80 - 9))
  return `${trimmed}-${suffix}`
}

export function buildLearnLessonPath(
  locale: string,
  courseSlug: string,
  lessonSlug: string
): string {
  return `/${locale}/learn/${courseSlug}/${lessonSlug}`
}
