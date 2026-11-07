'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SectionWithLessons } from '@/lib/courses/lesson-utils'
import { getCourseForEdit } from '@/lib/instructor/get-course-for-edit'
import {
  lessonSchema,
  sectionSchema,
  step1Schema,
  step4Schema,
  type Step1FormValues,
} from '@/lib/instructor/course-wizard-schemas'
import { revalidateCourseStudioPaths } from '@/lib/instructor/studio/revalidate-course-paths'
import { resolveLessonDurationMinutes } from '@/lib/instructor/resolve-lesson-duration'
import { notifyAllAdmins } from '@/lib/admin/notify-admins'
import { requirePaidCourseRevenueAgreement } from '@/lib/revenue/require-agreement'
import { ensureUniqueCourseSlug, ensureUniqueLessonSlug } from '@/lib/courses/resolve-learn-route'
import { createCourseQuiz } from '@/lib/courses/quiz-actions'
import { updateCourseOrQueue } from '@/lib/instructor/course-edit-queue'
import { randomUUID } from 'crypto'

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

async function getInstructorUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

export async function saveCourseStep1(
  values: Step1FormValues,
  courseId: string | null,
  locale: string
): Promise<{ success: boolean; courseId?: string; error?: string; pendingReview?: boolean }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const parsed = step1Schema.safeParse(values)
  if (!parsed.success) return { success: false, error: 'validation_failed' }

  const supabase = await createClient()
  const payload = {
    ...parsed.data,
    language: parsed.data.language,
    status: 'draft' as const,
    instructor_id: userId,
  }

  if (courseId) {
    const owner = await verifyCourseOwner(courseId, userId)
    if (!owner) return { success: false, error: 'not_found' }

    // Report BS-75: a published course's edits are queued for admin approval.
    const res = await updateCourseOrQueue(courseId, {
      title: parsed.data.title,
      title_ar: parsed.data.title_ar,
      description: parsed.data.description,
      description_ar: parsed.data.description_ar,
      category: parsed.data.category,
      level: parsed.data.level,
      language: parsed.data.language,
    })
    if (!res.ok) return { success: false, error: res.error }
    revalidateCourseStudioPaths(courseId, locale)
    return { success: true, courseId, pendingReview: res.pendingReview }
  }

  const newCourseId = randomUUID()
  const slug = await ensureUniqueCourseSlug(parsed.data.title, newCourseId)

  const { data, error } = await supabase
    .from('courses')
    .insert({
      ...payload,
      id: newCourseId,
      slug,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'insert_failed' }

  revalidatePath(`/${locale}/instructor/courses`)
  return { success: true, courseId: data.id as string }
}

export async function saveCourseStep2(
  courseId: string,
  thumbnailUrl: string | null,
  previewVideoAssetId: string | null,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  const updates: Record<string, string | null> = {}
  if (thumbnailUrl !== null) updates.thumbnail_url = thumbnailUrl
  if (previewVideoAssetId !== null) updates.preview_video_asset_id = previewVideoAssetId

  const { error } = await supabase.from('courses').update(updates).eq('id', courseId)
  if (error) return { success: false, error: error.message }

    revalidateCourseStudioPaths(courseId, locale)
  return { success: true }
}

export async function createSection(
  courseId: string,
  values: { title: string; title_ar: string },
  locale: string
): Promise<{ success: boolean; sectionId?: string; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const parsed = sectionSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: 'validation_failed' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('course_sections')
    .select('order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0

  const { data, error } = await supabase
    .from('course_sections')
    .insert({
      course_id: courseId,
      title: parsed.data.title,
      title_ar: parsed.data.title_ar,
      order_index: nextIndex,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: error?.message }

    revalidateCourseStudioPaths(courseId, locale)
  return { success: true, sectionId: data.id as string }
}

export async function deleteSection(
  sectionId: string,
  courseId: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('course_sections')
    .delete()
    .eq('id', sectionId)
    .eq('course_id', courseId)

  if (error) return { success: false, error: error.message }

  await syncCourseLessonStats(courseId)
    revalidateCourseStudioPaths(courseId, locale)
  return { success: true }
}

export async function createLesson(
  sectionId: string,
  courseId: string,
  values: {
    title: string
    title_ar: string
    duration_minutes: number
    is_free_preview: boolean
    video_asset_id?: string | null
    content_html?: string
  },
  locale: string,
  explicitLessonId?: string
): Promise<{ success: boolean; lessonId?: string; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const parsed = lessonSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: 'validation_failed' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0
  const newLessonId = explicitLessonId ?? randomUUID()
  const slug = await ensureUniqueLessonSlug(parsed.data.title, newLessonId, courseId)

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      section_id: sectionId,
      course_id: courseId,
      id: newLessonId,
      slug,
      title: parsed.data.title,
      title_ar: parsed.data.title_ar,
      duration_minutes: parsed.data.duration_minutes,
      is_free_preview: parsed.data.is_free_preview,
      video_asset_id: parsed.data.video_asset_id ?? null,
      content_html: values.content_html ?? null,
      order_index: nextIndex,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: error?.message }

  await syncCourseLessonStats(courseId)
    revalidateCourseStudioPaths(courseId, locale)
  return { success: true, lessonId: data.id as string }
}

export async function updateLesson(
  lessonId: string,
  courseId: string,
  values: {
    title: string
    title_ar: string
    duration_minutes: number
    is_free_preview: boolean
    video_asset_id?: string | null
    content_html?: string
  },
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const parsed = lessonSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: 'validation_failed' }

  const duration_minutes = await resolveLessonDurationMinutes(
    parsed.data.video_asset_id,
    parsed.data.duration_minutes
  )

  const supabase = await createClient()
  const { error } = await supabase
    .from('lessons')
    .update({
      title: parsed.data.title,
      title_ar: parsed.data.title_ar,
      duration_minutes,
      is_free_preview: parsed.data.is_free_preview,
      video_asset_id: parsed.data.video_asset_id ?? null,
      ...(values.content_html !== undefined ? { content_html: values.content_html } : {}),
    })
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (error) return { success: false, error: error.message }

  await syncCourseLessonStats(courseId)
    revalidateCourseStudioPaths(courseId, locale)
  return { success: true }
}

export async function deleteLesson(
  lessonId: string,
  courseId: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (error) return { success: false, error: error.message }

  await syncCourseLessonStats(courseId)
    revalidateCourseStudioPaths(courseId, locale)
  return { success: true }
}

export async function syncCourseLessonStats(courseId: string): Promise<void> {
  const supabase = await createClient()
  const { data: lessons } = await supabase
    .from('lessons')
    .select('duration_minutes')
    .eq('course_id', courseId)

  const total_lessons = lessons?.length ?? 0
  const total_duration_minutes = (lessons ?? []).reduce(
    (sum, l) => sum + (l.duration_minutes as number),
    0
  )

  await supabase
    .from('courses')
    .update({ total_lessons, total_duration_minutes })
    .eq('id', courseId)
}

export async function saveCourseStep4(
  courseId: string,
  price: number,
  locale: string
): Promise<{ success: boolean; error?: string; pendingReview?: boolean }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const parsed = step4Schema.safeParse({ price })
  if (!parsed.success) return { success: false, error: 'validation_failed' }

  // Report BS-75: a price change on a published course is queued for approval.
  const res = await updateCourseOrQueue(courseId, { price: parsed.data.price })
  if (!res.ok) return { success: false, error: res.error }

  revalidateCourseStudioPaths(courseId, locale)
  return { success: true, pendingReview: res.pendingReview }
}

export async function submitCourseForReview(
  courseId: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const data = await getCourseForEdit(courseId, userId)
  if (!data) return { success: false, error: 'not_found' }

  const { course, sections } = data

  if (course.status === 'pending') {
    return { success: false, error: 'already_pending' }
  }

  if (course.status === 'published') {
    return { success: false, error: 'already_published' }
  }

  const lessonCount = sections.reduce(
    (sum, section) => sum + (section.lessons?.length ?? 0),
    0
  )

  if (sections.length === 0 || lessonCount === 0) {
    return { success: false, error: 'no_curriculum' }
  }

  if (!course.title?.trim() || !course.title_ar?.trim()) {
    return { success: false, error: 'missing_title' }
  }

  const agreementCheck = await requirePaidCourseRevenueAgreement(
    courseId,
    Number(course.price)
  )
  if (!agreementCheck.ok) {
    return { success: false, error: agreementCheck.error }
  }

  const supabase = await createClient()
  const { data: updatedRows, error } = await supabase
    .from('courses')
    .update({
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .in('status', ['draft', 'rejected'])
    .select('id')

  if (error) return { success: false, error: error.message }
  if (!updatedRows?.length) return { success: false, error: 'submit_failed' }

  const title = course.title
  const titleAr = course.title_ar

  await notifyAllAdmins({
    title: 'New course for review',
    titleAr: 'كورس جديد للمراجعة',
    body: `"${title}" was submitted and is awaiting your approval.`,
    bodyAr: `تم إرسال كورس "${titleAr}" وهو بانتظار موافقتك.`,
    type: `course_review:${courseId}`,
  })

  revalidatePath(`/${locale}/admin/courses`)
  revalidatePath(`/${locale}/instructor/courses`)
  revalidateCourseStudioPaths(courseId, locale)
  return { success: true }
}

export async function getCourseWizardSections(
  courseId: string
): Promise<{ sections: SectionWithLessons[]; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { sections: [], error: 'unauthorized' }

  const data = await getCourseForEdit(courseId, userId)
  if (!data) return { sections: [], error: 'not_found' }

  return { sections: data.sections }
}

export async function finalizeCurriculumStep(
  courseId: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  await syncCourseLessonStats(courseId)
    revalidateCourseStudioPaths(courseId, locale)
  return { success: true }
}

function lessonContentHtml(description_ar: string, description_en: string): string {
  return JSON.stringify({ description_ar, description_en })
}

// Report BS-60: turn AI-generated plain-text notes into safe HTML paragraphs for
// the trainer-only notes column (escapes HTML, splits on blank lines / newlines).
function notesTextToHtml(text: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  const blocks = text
    .split(/\n\s*\n|\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  return blocks.map((b) => `<p>${escape(b)}</p>`).join('')
}

export async function applyAiCourseStructure(
  courseId: string,
  structure: {
    sections: Array<{
      title_ar: string
      title_en: string
      lessons: Array<{
        title_ar: string
        title_en: string
        duration_estimate_minutes: number
        description_ar: string
        description_en: string
        is_free_preview: boolean
        // Report BS-59/60: quizzes + trainer notes generated in the same call.
        quiz_questions?: Array<{
          question_ar: string
          question_en: string
          options_ar: string[]
          options_en: string[]
          correct_option_index: number
        }>
        notes_ar?: string
        notes_en?: string
      }>
    }>
    description_ar: string
    description_en: string
    learning_outcomes_ar?: string[]
    learning_outcomes_en?: string[]
  },
  locale: string,
  replaceExisting = true
): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const supabase = await createClient()

  const learningOutcomes =
    locale === 'ar'
      ? structure.learning_outcomes_ar ?? structure.learning_outcomes_en ?? []
      : structure.learning_outcomes_en ?? structure.learning_outcomes_ar ?? []

  await supabase
    .from('courses')
    .update({
      description: structure.description_en,
      description_ar: structure.description_ar,
      learning_outcomes: learningOutcomes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)

  if (replaceExisting) {
    await supabase.from('course_sections').delete().eq('course_id', courseId)
  }

  // Report BS-59/76: parts of the AI response that could not be saved are
  // collected here and reported to the instructor instead of vanishing.
  const warnings: string[] = []

  for (const section of structure.sections) {
    const sectionResult = await createSection(
      courseId,
      { title: section.title_en, title_ar: section.title_ar },
      locale
    )
    if (!sectionResult.success || !sectionResult.sectionId) {
      return { success: false, error: sectionResult.error ?? 'section_failed' }
    }

    for (const lesson of section.lessons) {
      const notes = locale === 'ar' ? lesson.notes_ar : lesson.notes_en
      const lessonResult = await createLessonWithContent(
        sectionResult.sectionId,
        courseId,
        {
          title: lesson.title_en,
          title_ar: lesson.title_ar,
          duration_minutes: lesson.duration_estimate_minutes,
          is_free_preview: lesson.is_free_preview,
          content_html: lessonContentHtml(lesson.description_ar, lesson.description_en),
          // Report BS-60: save the AI notes generated in this same call.
          trainer_notes_html: notes ? notesTextToHtml(notes) : undefined,
        },
        locale
      )
      if (!lessonResult.success) {
        return { success: false, error: lessonResult.error ?? 'lesson_failed' }
      }

      // Report BS-59/76: persist the AI-generated quiz for this lesson AND report
      // it when a part could not be saved — nothing is dropped silently.
      if (lessonResult.lessonId && lesson.quiz_questions?.length) {
        const ar = locale === 'ar'
        const quizResult = await createCourseQuiz(courseId, locale, {
          title: `${ar ? lesson.title_ar : lesson.title_en} — Quiz`,
          lesson_id: lessonResult.lessonId,
          questions: lesson.quiz_questions.map((q) => ({
            question_text: (ar ? q.question_ar : q.question_en).trim(),
            options: (ar ? q.options_ar : q.options_en).map((o) => o.trim()),
            correct_index: q.correct_option_index,
          })),
        })
        if (!quizResult.success) {
          warnings.push(
            `quiz:${locale === 'ar' ? lesson.title_ar : lesson.title_en}:${quizResult.error ?? 'failed'}`
          )
        }
      }
      // Report BS-76: the AI returned notes but none reached the lesson.
      if (lessonResult.lessonId && !notes && (lesson.quiz_questions?.length ?? 0) > 0) {
        warnings.push(`notes:${locale === 'ar' ? lesson.title_ar : lesson.title_en}:missing`)
      }
    }
  }

  await syncCourseLessonStats(courseId)
  revalidateCourseStudioPaths(courseId, locale)
  return { success: true, warnings: warnings.length ? warnings : undefined }
}

async function createLessonWithContent(
  sectionId: string,
  courseId: string,
  values: {
    title: string
    title_ar: string
    duration_minutes: number
    is_free_preview: boolean
    content_html?: string
    trainer_notes_html?: string
  },
  _locale: string
): Promise<{ success: boolean; lessonId?: string; error?: string }> {
  const userId = await getInstructorUserId()
  if (!userId) return { success: false, error: 'unauthorized' }

  const owner = await verifyCourseOwner(courseId, userId)
  if (!owner) return { success: false, error: 'not_found' }

  const parsed = lessonSchema.safeParse({
    title: values.title,
    title_ar: values.title_ar,
    duration_minutes: values.duration_minutes,
    is_free_preview: values.is_free_preview,
  })
  if (!parsed.success) return { success: false, error: 'validation_failed' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0
  const newLessonId = randomUUID()
  const slug = await ensureUniqueLessonSlug(parsed.data.title, newLessonId, courseId)

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      section_id: sectionId,
      course_id: courseId,
      id: newLessonId,
      slug,
      title: parsed.data.title,
      title_ar: parsed.data.title_ar,
      duration_minutes: parsed.data.duration_minutes,
      is_free_preview: parsed.data.is_free_preview,
      content_html: values.content_html ?? null,
      trainer_notes_html: values.trainer_notes_html ?? null,
      order_index: nextIndex,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: error?.message }

  return { success: true, lessonId: data.id as string }
}
