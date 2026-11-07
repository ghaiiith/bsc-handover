import 'server-only'

import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureUniqueCourseSlug } from '@/lib/courses/resolve-learn-route'
import { ensureUniqueLessonSlug } from '@/lib/courses/resolve-learn-route'
import { syncCourseLessonStats } from '@/lib/instructor/course-wizard-actions'
import type { Course, CourseStatus, CourseVisibility, User } from '@/types'

export type AdminCourseStatusFilter = CourseStatus | 'all' | 'archived'

export interface AdminCourseListItem extends Omit<Course, 'instructor'> {
  instructor: Pick<User, 'id' | 'full_name' | 'full_name_ar'>
  enrollment_count: number
}

export interface AdminCourseStats {
  published: number
  pending: number
  draft: number
  rejected: number
  archived: number
}

export interface CourseListParams {
  status?: AdminCourseStatusFilter
  category?: string
  q?: string
  sort?: 'updated_at' | 'title' | 'created_at' | 'price'
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface CourseListResult {
  items: AdminCourseListItem[]
  total: number
  page: number
  pageSize: number
  stats: AdminCourseStats
}

type RawRow = Course & {
  instructor: Pick<User, 'id' | 'full_name' | 'full_name_ar'> | null
  enrollments: { count: number }[]
}

function enrich(row: RawRow): AdminCourseListItem | null {
  if (!row.instructor) return null
  const { enrollments, instructor, ...course } = row
  return {
    ...course,
    instructor,
    enrollment_count: enrollments?.[0]?.count ?? 0,
  }
}

export async function getCourseStats(): Promise<AdminCourseStats> {
  const admin = createAdminClient()
  const statuses: CourseStatus[] = ['published', 'pending', 'draft', 'rejected']
  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await admin
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      return { status, count: count ?? 0 }
    })
  )
  const { count: archivedCount } = await admin
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('visibility', 'archived')

  const map = Object.fromEntries(counts.map((c) => [c.status, c.count]))
  return {
    published: map.published ?? 0,
    pending: map.pending ?? 0,
    draft: map.draft ?? 0,
    rejected: map.rejected ?? 0,
    archived: archivedCount ?? 0,
  }
}

export async function listCourses(params: CourseListParams = {}): Promise<CourseListResult> {
  const admin = createAdminClient()
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = admin
    .from('courses')
    .select(
      `
      *,
      instructor:users(id, full_name, full_name_ar),
      enrollments(count)
    `,
      { count: 'exact' }
    )

  if (params.status && params.status !== 'all') {
    if (params.status === 'archived') {
      query = query.eq('visibility', 'archived')
    } else {
      query = query.eq('status', params.status)
    }
  }

  if (params.category) {
    query = query.eq('category', params.category)
  }

  const term = params.q?.trim()
  if (term) {
    query = query.or(
      `title.ilike.%${term}%,title_ar.ilike.%${term}%,slug.ilike.%${term}%`
    )
  }

  const sortCol = params.sort ?? 'updated_at'
  const ascending = params.order === 'asc'
  query = query.order(sortCol, { ascending }).range(from, to)

  const [{ data, count, error }, stats] = await Promise.all([
    query,
    getCourseStats(),
  ])

  if (error) throw new Error(error.message)

  const items = (data ?? [])
    .map((row) => enrich(row as RawRow))
    .filter((row): row is AdminCourseListItem => row != null)

  return { items, total: count ?? 0, page, pageSize, stats }
}

export async function getCourseById(courseId: string): Promise<AdminCourseListItem | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('courses')
    .select(
      `
      *,
      instructor:users(id, full_name, full_name_ar),
      enrollments(count)
    `
    )
    .eq('id', courseId)
    .maybeSingle()

  if (error || !data) return null
  return enrich(data as RawRow)
}

export async function createCourse(input: {
  instructorId: string
  title: string
  title_ar: string
  description?: string
  description_ar?: string
  category: string
  level: string
  language: string
}): Promise<{ courseId: string }> {
  const admin = createAdminClient()
  const { data: instructor } = await admin
    .from('users')
    .select('id, role')
    .eq('id', input.instructorId)
    .single()

  if (!instructor || instructor.role !== 'instructor') {
    throw new Error('invalid_instructor')
  }

  const newCourseId = randomUUID()
  const slug = await ensureUniqueCourseSlug(input.title, newCourseId)

  const { data, error } = await admin
    .from('courses')
    .insert({
      id: newCourseId,
      slug,
      title: input.title.trim(),
      title_ar: input.title_ar.trim(),
      description: input.description?.trim() ?? '',
      description_ar: input.description_ar?.trim() ?? '',
      category: input.category,
      level: input.level,
      language: input.language,
      status: 'draft',
      visibility: 'draft',
      instructor_id: input.instructorId,
      price: 0,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'insert_failed')
  return { courseId: data.id as string }
}

/**
 * Columns an admin/instructor may set via the CMS. Excludes identity/ownership
 * and system columns (`id`, `instructor_id`, `slug`, `created_at`, `updated_at`)
 * so a raw request body cannot reassign course ownership or forge timestamps.
 */
const UPDATABLE_COURSE_COLUMNS = new Set<string>([
  'title', 'title_ar', 'description', 'description_ar', 'thumbnail_url',
  'preview_video_url', 'preview_video_asset_id', 'price', 'discount_price',
  'category', 'subcategory', 'level', 'language', 'status', 'visibility',
  'access_type', 'subtitle', 'subtitle_ar', 'cover_image_url', 'meta_title',
  'meta_description', 'seo_keywords', 'learning_outcomes', 'target_audience',
  'requirements', 'certificate_enabled', 'certificate_template',
  'certificate_min_progress', 'final_exam_required', 'final_exam_pdf_path',
  'final_exam_pdf_name', 'video_upload_provider', 'rejection_reason',
  'rejection_note', 'total_lessons', 'total_duration_minutes',
])

export async function updateCourse(
  courseId: string,
  values: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [key, value] of Object.entries(values)) {
    if (UPDATABLE_COURSE_COLUMNS.has(key)) payload[key] = value
  }
  const { error } = await admin.from('courses').update(payload).eq('id', courseId)
  if (error) throw new Error(error.message)
}

export async function deleteCourse(courseId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('courses').delete().eq('id', courseId)
  if (error) throw new Error(error.message)
}

export async function publishCourse(courseId: string): Promise<void> {
  await updateCourse(courseId, { status: 'published', visibility: 'published' })
}

export async function unpublishCourse(courseId: string): Promise<void> {
  await updateCourse(courseId, { status: 'draft', visibility: 'draft' })
}

export async function archiveCourse(courseId: string): Promise<void> {
  await updateCourse(courseId, { visibility: 'archived' as CourseVisibility, status: 'draft' })
}

export async function duplicateCourse(courseId: string): Promise<{ courseId: string }> {
  const admin = createAdminClient()
  const { data: source, error } = await admin
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (error || !source) throw new Error('not_found')

  const newCourseId = randomUUID()
  const slug = await ensureUniqueCourseSlug(`${source.title} Copy`, newCourseId)

  const { instructor_id, id: _id, created_at: _c, updated_at: _u, slug: _s, ...rest } = source
  const { error: insertErr } = await admin.from('courses').insert({
    ...rest,
    id: newCourseId,
    slug,
    instructor_id,
    title: `${source.title} (Copy)`,
    title_ar: `${source.title_ar} (نسخة)`,
    status: 'draft',
    visibility: 'draft',
    total_lessons: 0,
    total_duration_minutes: 0,
  })

  if (insertErr) throw new Error(insertErr.message)

  const { data: sections } = await admin
    .from('course_sections')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index')

  const sectionIdMap = new Map<string, string>()

  for (const section of sections ?? []) {
    const newSectionId = randomUUID()
    sectionIdMap.set(section.id, newSectionId)
    await admin.from('course_sections').insert({
      id: newSectionId,
      course_id: newCourseId,
      title: section.title,
      title_ar: section.title_ar,
      order_index: section.order_index,
    })
  }

  const { data: lessons } = await admin
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index')

  for (const lesson of lessons ?? []) {
    const newLessonId = randomUUID()
    const newSectionId = sectionIdMap.get(lesson.section_id)
    if (!newSectionId) continue
    const lessonSlug = await ensureUniqueLessonSlug(lesson.title, newLessonId, newCourseId)
    const { section_id: _sid, id: _lid, course_id: _cid, slug: _sl, video_asset_id: _va, ...lessonRest } =
      lesson
    await admin.from('lessons').insert({
      ...lessonRest,
      id: newLessonId,
      course_id: newCourseId,
      section_id: newSectionId,
      slug: lessonSlug,
      video_asset_id: null,
    })
  }

  await syncCourseLessonStats(newCourseId)
  return { courseId: newCourseId }
}

export async function bulkCourseAction(
  courseIds: string[],
  action: 'publish' | 'unpublish' | 'archive' | 'delete'
): Promise<{ affected: number }> {
  let affected = 0
  for (const id of courseIds) {
    try {
      if (action === 'publish') await publishCourse(id)
      else if (action === 'unpublish') await unpublishCourse(id)
      else if (action === 'archive') await archiveCourse(id)
      else if (action === 'delete') await deleteCourse(id)
      affected++
    } catch {
      /* skip failed */
    }
  }
  return { affected }
}
