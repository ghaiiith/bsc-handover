'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getCourseForEdit } from '@/lib/instructor/get-course-for-edit'
import { syncCourseLessonStats } from '@/lib/instructor/course-wizard-actions'
import { updateCourseOrQueue } from '@/lib/instructor/course-edit-queue'
import { revalidateCourseStudioPaths } from '@/lib/instructor/studio/revalidate-course-paths'
import { syncLessonAttachmentResource } from '@/lib/courses/lesson-resource-sync'
import { syncLessonQuizTitle, ensureLessonQuiz } from '@/lib/courses/quiz-actions'
import { ensureUniqueLessonSlug } from '@/lib/courses/resolve-learn-route'
import { lessonSchema } from '@/lib/instructor/course-wizard-schemas'
import { resolveLessonDurationMinutes } from '@/lib/instructor/resolve-lesson-duration'
import type { LessonType, ResourceCategory, ResourceUrlAccessMode } from '@/types'
import { isSupabaseStorageUrl } from '@/lib/storage/supabase-url'
import { sanitizeRichText } from '@/lib/html/sanitize-html'

async function getInstructorUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return null
  }

  return user.id
}

async function verifyCourseOwner(courseId: string, userId: string) {
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .single()

  if (!course) return null

  // The course instructor OR any admin may manage it (joint management).
  if (course.instructor_id !== userId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') return null
  }

  return course
}

function revalidateStudio(courseId: string, locale: string, lessonId?: string) {
  revalidateCourseStudioPaths(courseId, locale)
  if (lessonId) {
    revalidatePath(`/${locale}/learn/${courseId}/${lessonId}`)
  }
}

export async function reorderSections(
  courseId: string,
  sectionIds: string[],
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  for (let i = 0; i < sectionIds.length; i++) {
    const { error } = await supabase
      .from('course_sections')
      .update({ order_index: i })
      .eq('id', sectionIds[i])
      .eq('course_id', courseId)
    if (error) return { success: false, error: error.message }
  }

  revalidateStudio(courseId, locale)
  return { success: true }
}

export async function reorderLessons(
  courseId: string,
  sectionId: string,
  lessonIds: string[],
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  for (let i = 0; i < lessonIds.length; i++) {
    const { error } = await supabase
      .from('lessons')
      .update({ order_index: i, section_id: sectionId })
      .eq('id', lessonIds[i])
      .eq('course_id', courseId)
    if (error) return { success: false, error: error.message }
  }

  revalidateStudio(courseId, locale)
  return { success: true }
}

export async function moveLessonToSection(
  courseId: string,
  lessonId: string,
  targetSectionId: string,
  orderIndex: number,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lessons')
    .update({ section_id: targetSectionId, order_index: orderIndex })
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (error) return { success: false, error: error.message }

  await syncCourseLessonStats(courseId)
  revalidateStudio(courseId, locale)
  return { success: true }
}

export async function updateSectionTitle(
  sectionId: string,
  courseId: string,
  title: string,
  title_ar: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }
  if (!title.trim() || !title_ar.trim()) return { success: false, error: 'validation_failed' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('course_sections')
    .update({ title: title.trim(), title_ar: title_ar.trim() })
    .eq('id', sectionId)
    .eq('course_id', courseId)

  if (error) return { success: false, error: error.message }
  revalidateStudio(courseId, locale)
  return { success: true }
}

export async function saveCourseStudioInfo(
  courseId: string,
  locale: string,
  values: Record<string, unknown>
): Promise<{ success: boolean; error?: string; pendingReview?: boolean }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()

  // Report BS-75: on a published course these edits are queued for admin
  // approval (stored as JSON, so no live-schema fallback is needed).
  const queued = await updateCourseOrQueue(courseId, values)
  if (queued.ok && queued.pendingReview) {
    revalidateStudio(courseId, locale)
    return { success: true, pendingReview: true }
  }

  const { error } = queued.ok
    ? { error: null }
    : await supabase.from('courses').update(values).eq('id', courseId)

  if (error) {
    const coreFields = { ...values }
    delete coreFields.subtitle
    delete coreFields.subtitle_ar
    delete coreFields.subcategory
    delete coreFields.cover_image_url
    delete coreFields.meta_title
    delete coreFields.meta_description
    delete coreFields.seo_keywords
    delete coreFields.visibility
    delete coreFields.access_type
    delete coreFields.discount_price
    delete coreFields.instructor_discount_percent
    delete coreFields.learning_outcomes
    delete coreFields.target_audience
    delete coreFields.requirements

    const { error: fallbackError } = await supabase
      .from('courses')
      .update(coreFields)
      .eq('id', courseId)

    if (fallbackError) return { success: false, error: fallbackError.message }
  }

  revalidateStudio(courseId, locale)
  return { success: true }
}

export async function updateLessonStudio(
  lessonId: string,
  courseId: string,
  values: {
    title?: string
    title_ar?: string
    lesson_type?: LessonType
    duration_minutes?: number
    is_free_preview?: boolean
    is_mandatory?: boolean
    video_asset_id?: string | null
    content_html?: string | null
    external_url?: string | null
    attachment_url?: string | null
    trainer_notes_html?: string | null
    slides_url?: string | null
    slides_name?: string | null
  },
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  // Explicit column allowlist — `values` is a server-action arg, so at runtime
  // it can carry arbitrary keys (the TS type is erased). Never spread it into
  // an UPDATE (would let an instructor set id/slug/order_index/lesson_type/…).
  const ALLOWED_LESSON_COLUMNS = [
    'title',
    'title_ar',
    'duration_minutes',
    'is_free_preview',
    'video_asset_id',
    'content_html',
    'external_url',
    'attachment_url',
    'trainer_notes_html',
    'slides_url',
    'slides_name',
  ] as const
  const raw = values as Record<string, unknown>
  const payload: Record<string, unknown> = {}
  for (const key of ALLOWED_LESSON_COLUMNS) {
    if (raw[key] !== undefined) payload[key] = raw[key]
  }

  // Report BS-31: notes are HTML the trainer types (or the AI writes), so they
  // are hardened before storage.
  if (typeof payload.trainer_notes_html === 'string') {
    payload.trainer_notes_html = sanitizeRichText(payload.trainer_notes_html)
  }

  if (
    payload.title !== undefined &&
    payload.title_ar !== undefined &&
    payload.duration_minutes !== undefined &&
    payload.is_free_preview !== undefined
  ) {
    const parsed = lessonSchema.safeParse({
      title: payload.title,
      title_ar: payload.title_ar,
      duration_minutes: payload.duration_minutes,
      is_free_preview: payload.is_free_preview,
      video_asset_id: payload.video_asset_id,
    })
    if (!parsed.success) return { success: false, error: 'validation_failed' }

    payload.title = parsed.data.title
    payload.title_ar = parsed.data.title_ar
    payload.is_free_preview = parsed.data.is_free_preview
    payload.video_asset_id = parsed.data.video_asset_id ?? null
    payload.duration_minutes = await resolveLessonDurationMinutes(
      parsed.data.video_asset_id,
      parsed.data.duration_minutes
    )
  } else if (payload.duration_minutes !== undefined || payload.video_asset_id !== undefined) {
    payload.duration_minutes = await resolveLessonDurationMinutes(
      (payload.video_asset_id as string | null | undefined) ?? null,
      (payload.duration_minutes as number | undefined) ?? 0
    )
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lessons')
    .update(payload)
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (error) return { success: false, error: error.message }

  if (values.title !== undefined) {
    const { data: lessonRow } = await supabase
      .from('lessons')
      .select('lesson_type')
      .eq('id', lessonId)
      .maybeSingle()

    if (lessonRow?.lesson_type === 'quiz') {
      await syncLessonQuizTitle(courseId, lessonId, values.title)
    }
  }

  if (values.attachment_url !== undefined) {
    const { data: lessonRow } = await supabase
      .from('lessons')
      .select('title, title_ar')
      .eq('id', lessonId)
      .maybeSingle()

    await syncLessonAttachmentResource(supabase, {
      courseId,
      lessonId,
      userId,
      attachmentUrl: values.attachment_url,
      title: lessonRow?.title ?? 'Lesson attachment',
      titleAr: lessonRow?.title_ar ?? '',
    })
  }

  await syncCourseLessonStats(courseId)
  revalidateStudio(courseId, locale, lessonId)
  return { success: true }
}

export async function saveLessonDetails(
  lessonId: string,
  courseId: string,
  values: {
    title: string
    title_ar: string
    duration_minutes: number
    is_free_preview: boolean
    is_mandatory: boolean
    video_asset_id?: string | null
    content_html?: string | null
    external_url?: string | null
    attachment_url?: string | null
    trainer_notes_html?: string | null
    slides_url?: string | null
    slides_name?: string | null
  },
  locale: string
): Promise<{ success: boolean; error?: string }> {
  return updateLessonStudio(
    lessonId,
    courseId,
    {
      title: values.title,
      title_ar: values.title_ar || values.title,
      duration_minutes: values.duration_minutes,
      is_free_preview: values.is_free_preview,
      is_mandatory: values.is_mandatory,
      video_asset_id: values.video_asset_id || null,
      content_html: values.content_html ?? null,
      external_url: values.external_url ?? null,
      attachment_url: values.attachment_url ?? null,
      trainer_notes_html: values.trainer_notes_html ?? null,
    },
    locale
  )
}

export async function createLessonWithType(
  sectionId: string,
  courseId: string,
  lessonType: LessonType,
  locale: string
): Promise<{ success: boolean; lessonId?: string; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0
  const newLessonId = randomUUID()
  const slug = await ensureUniqueLessonSlug('New Lesson', newLessonId, courseId)

  const payload: Record<string, unknown> = {
    id: newLessonId,
    slug,
    section_id: sectionId,
    course_id: courseId,
    title: 'New Lesson',
    title_ar: 'درس جديد',
    duration_minutes: 5,
    is_free_preview: false,
    is_mandatory: true,
    order_index: nextIndex,
    lesson_type: lessonType,
  }

  const { data, error } = await supabase
    .from('lessons')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    const fallbackPayload = { ...payload }
    delete fallbackPayload.lesson_type
    const { data: fallback, error: fallbackError } = await supabase
      .from('lessons')
      .insert(fallbackPayload)
      .select('id')
      .single()
    if (fallbackError || !fallback) return { success: false, error: fallbackError?.message }
    await syncCourseLessonStats(courseId)
    revalidateStudio(courseId, locale)
    return { success: true, lessonId: fallback.id as string }
  }

  if (lessonType === 'quiz' && data?.id) {
    await ensureLessonQuiz(courseId, data.id as string, 'New Lesson')
  }

  await syncCourseLessonStats(courseId)
  revalidateStudio(courseId, locale)
  return { success: true, lessonId: data.id as string }
}

export async function replyToReview(
  reviewId: string,
  courseId: string,
  reply: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reviews')
    .update({
      instructor_reply: reply.trim(),
      instructor_reply_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .eq('target_id', courseId)

  if (error) return { success: false, error: error.message }
  revalidateStudio(courseId, locale)
  return { success: true }
}

export async function getCourseResources(courseId: string, instructorId: string) {
  const { getCourseResourceLog } = await import('@/lib/courses/get-lesson-resources')
  return getCourseResourceLog(courseId, instructorId)
}

function normalizeResourceUrlAccessMode(
  fileUrl: string,
  mode: ResourceUrlAccessMode | undefined
): ResourceUrlAccessMode {
  if (isSupabaseStorageUrl(fileUrl.trim())) return 'download'
  return mode === 'visit' ? 'visit' : 'download'
}

export async function addCourseResource(
  courseId: string,
  locale: string,
  values: {
    title: string
    title_ar?: string
    file_url: string
    file_type: string
    category: ResourceCategory
    folder?: string
    lesson_id?: string | null
    file_size_bytes?: number
    url_access_mode?: ResourceUrlAccessMode
  }
): Promise<{ success: boolean; resourceId?: string; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('course_resources')
    .insert({
      course_id: courseId,
      ...values,
      url_access_mode: normalizeResourceUrlAccessMode(values.file_url, values.url_access_mode),
      added_source: 'studio',
      added_by: userId,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidateStudio(courseId, locale, values.lesson_id ?? undefined)
  return { success: true, resourceId: data.id as string }
}

export async function deleteCourseResource(
  resourceId: string,
  courseId: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()

  const { data: resource } = await supabase
    .from('course_resources')
    .select('lesson_id')
    .eq('id', resourceId)
    .eq('course_id', courseId)
    .maybeSingle()

  const { error } = await supabase
    .from('course_resources')
    .delete()
    .eq('id', resourceId)
    .eq('course_id', courseId)

  if (error) return { success: false, error: error.message }
  revalidateStudio(courseId, locale, resource?.lesson_id as string | undefined)
  return { success: true }
}

export async function updateCourseResource(
  resourceId: string,
  courseId: string,
  locale: string,
  values: {
    title: string
    title_ar?: string
    file_url: string
    file_type: string
    category: ResourceCategory
    folder?: string
    lesson_id?: string | null
    file_size_bytes?: number
    url_access_mode?: ResourceUrlAccessMode
  }
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('course_resources')
    .select('lesson_id, added_source')
    .eq('id', resourceId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!existing) return { success: false, error: 'not_found' }

  const payload =
    existing.added_source === 'lesson_editor'
      ? {
          title: values.title.trim(),
          title_ar: values.title_ar ?? null,
          category: values.category,
          folder: values.folder ?? 'general',
        }
      : {
          title: values.title.trim(),
          title_ar: values.title_ar ?? null,
          file_url: values.file_url.trim(),
          file_type: values.file_type,
          category: values.category,
          folder: values.folder ?? 'general',
          lesson_id: values.lesson_id ?? null,
          file_size_bytes: values.file_size_bytes ?? 0,
          url_access_mode: normalizeResourceUrlAccessMode(
            values.file_url,
            values.url_access_mode
          ),
        }

  const { error } = await supabase
    .from('course_resources')
    .update(payload)
    .eq('id', resourceId)
    .eq('course_id', courseId)

  if (error) return { success: false, error: error.message }

  const lessonId = (values.lesson_id ?? existing.lesson_id) as string | undefined
  revalidateStudio(courseId, locale, lessonId)
  return { success: true }
}

export async function getCourseAssignments(courseId: string, instructorId: string) {
  const data = await getCourseForEdit(courseId, instructorId)
  if (!data) return []

  const supabase = await createClient()
  const { data: items } = await supabase
    .from('course_assignments')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  return items ?? []
}

export async function getCourseQuizzes(courseId: string, instructorId: string) {
  const data = await getCourseForEdit(courseId, instructorId)
  if (!data) return []

  const supabase = await createClient()
  const { data: items } = await supabase
    .from('course_quizzes')
    .select('*, quiz_questions(count), lessons(id, title, title_ar)')
    .eq('course_id', courseId)
    .not('lesson_id', 'is', null)
    .order('created_at', { ascending: false })

  return items ?? []
}
