import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildCourseSlugCandidate,
  buildLessonSlugCandidate,
  isUuid,
  isValidCourseSlug,
} from '@/lib/courses/course-slug'

export async function ensureUniqueCourseSlug(
  title: string,
  courseId: string,
  excludeCourseId?: string
): Promise<string> {
  const admin = createAdminClient()
  let candidate = buildCourseSlugCandidate(title, courseId)

  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`
    if (!isValidCourseSlug(slug)) {
      candidate = buildCourseSlugCandidate(title, courseId)
      continue
    }

    let query = admin.from('courses').select('id').eq('slug', slug).limit(1)
    if (excludeCourseId) {
      query = query.neq('id', excludeCourseId)
    }

    const { data } = await query.maybeSingle()
    if (!data) return slug
  }

  return buildCourseSlugCandidate(`${title}-${Date.now()}`, courseId)
}

export async function ensureUniqueLessonSlug(
  title: string,
  lessonId: string,
  courseId: string,
  excludeLessonId?: string
): Promise<string> {
  const admin = createAdminClient()
  let candidate = buildLessonSlugCandidate(title, lessonId)

  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`
    if (!isValidCourseSlug(slug)) {
      candidate = buildLessonSlugCandidate(title, lessonId)
      continue
    }

    let query = admin
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('slug', slug)
      .limit(1)

    if (excludeLessonId) {
      query = query.neq('id', excludeLessonId)
    }

    const { data } = await query.maybeSingle()
    if (!data) return slug
  }

  return buildLessonSlugCandidate(`${title}-${Date.now()}`, lessonId)
}

export async function resolveCourseParam(
  courseParam: string
): Promise<{ id: string; slug: string } | null> {
  const admin = createAdminClient()

  if (isUuid(courseParam)) {
    const { data } = await admin
      .from('courses')
      .select('id, slug')
      .eq('id', courseParam)
      .maybeSingle()
    return data ? { id: data.id, slug: data.slug } : null
  }

  const { data } = await admin
    .from('courses')
    .select('id, slug')
    .eq('slug', courseParam)
    .maybeSingle()

  return data ? { id: data.id, slug: data.slug } : null
}

export type ResolvedLearnRoute =
  | {
      ok: true
      courseId: string
      lessonId: string
      courseSlug: string
      lessonSlug: string
      redirectTo?: string
    }
  | { ok: false; reason: 'not_found' }

export async function resolveLearnRoute(
  locale: string,
  courseParam: string,
  lessonParam: string
): Promise<ResolvedLearnRoute> {
  const admin = createAdminClient()

  let courseRow: { id: string; slug: string } | null = null

  if (isUuid(courseParam)) {
    const { data } = await admin
      .from('courses')
      .select('id, slug')
      .eq('id', courseParam)
      .maybeSingle()
    courseRow = data
  } else {
    const { data } = await admin
      .from('courses')
      .select('id, slug')
      .eq('slug', courseParam)
      .maybeSingle()
    courseRow = data
  }

  if (!courseRow) {
    return { ok: false, reason: 'not_found' }
  }

  let lessonRow: { id: string; slug: string } | null = null

  if (isUuid(lessonParam)) {
    const { data } = await admin
      .from('lessons')
      .select('id, slug')
      .eq('id', lessonParam)
      .eq('course_id', courseRow.id)
      .maybeSingle()
    lessonRow = data
  } else {
    const { data } = await admin
      .from('lessons')
      .select('id, slug')
      .eq('course_id', courseRow.id)
      .eq('slug', lessonParam)
      .maybeSingle()
    lessonRow = data
  }

  if (!lessonRow) {
    return { ok: false, reason: 'not_found' }
  }

  const canonicalPath = `/${locale}/learn/${courseRow.slug}/${lessonRow.slug}`
  const usedLegacyIds =
    courseParam !== courseRow.slug || lessonParam !== lessonRow.slug

  return {
    ok: true,
    courseId: courseRow.id,
    lessonId: lessonRow.id,
    courseSlug: courseRow.slug,
    lessonSlug: lessonRow.slug,
    redirectTo: usedLegacyIds ? canonicalPath : undefined,
  }
}
