import 'server-only'

import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureUniqueLessonSlug } from '@/lib/courses/resolve-learn-route'
import { syncCourseLessonStats } from '@/lib/instructor/course-wizard-actions'
import type { Lesson, LessonType, VideoAsset } from '@/types'

export interface LessonDetail extends Lesson {
  video_asset?: VideoAsset | null
  processing_status?: string
  upload_status?: string
  is_locked?: boolean
  publication_status?: 'draft' | 'published'
}

export interface LessonVideoInfo {
  lesson: LessonDetail
  probe?: {
    resolution?: string
    fps?: number
    videoCodec?: string
    audioCodec?: string
    aspectRatio?: string
    bitrate?: number
    durationSeconds?: number
    segmentCount?: number
    thumbnailCount?: number
    fileSize?: number
    processingMs?: number
    uploadedAt?: string
  }
}

export async function getLessonDetail(courseId: string, lessonId: string): Promise<LessonDetail | null> {
  const admin = createAdminClient()
  const { data: lesson, error } = await admin
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (error || !lesson) return null

  let asset: VideoAsset | null = null
  if (lesson.video_asset_id) {
    const { data } = await admin
      .from('video_assets')
      .select('*')
      .eq('id', lesson.video_asset_id)
      .maybeSingle()
    asset = (data as VideoAsset) ?? null
  }

  return {
    ...(lesson as Lesson),
    video_asset: asset,
    processing_status: asset?.status ?? 'none',
    upload_status: asset?.status ?? 'none',
    is_locked: lesson.is_mandatory ?? true,
    publication_status:
      asset?.status === 'ready' || (lesson.lesson_type && lesson.lesson_type !== 'video')
        ? 'published'
        : 'draft',
  }
}

export async function createLesson(
  courseId: string,
  sectionId: string,
  input: {
    title: string
    title_ar: string
    duration_minutes?: number
    is_free_preview?: boolean
    lesson_type?: LessonType
  }
): Promise<{ lessonId: string }> {
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('lessons')
    .select('order_index')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0
  const newLessonId = randomUUID()
  const slug = await ensureUniqueLessonSlug(input.title, newLessonId, courseId)

  const { data, error } = await admin
    .from('lessons')
    .insert({
      id: newLessonId,
      section_id: sectionId,
      course_id: courseId,
      slug,
      title: input.title.trim(),
      title_ar: input.title_ar.trim(),
      duration_minutes: input.duration_minutes ?? 0,
      is_free_preview: input.is_free_preview ?? false,
      lesson_type: input.lesson_type ?? 'video',
      order_index: nextIndex,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'insert_failed')
  await syncCourseLessonStats(courseId)
  return { lessonId: data.id as string }
}

export async function updateLesson(
  courseId: string,
  lessonId: string,
  values: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('lessons')
    .update(values)
    .eq('id', lessonId)
    .eq('course_id', courseId)
  if (error) throw new Error(error.message)
  await syncCourseLessonStats(courseId)
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('lessons')
    .delete()
    .eq('id', lessonId)
    .eq('course_id', courseId)
  if (error) throw new Error(error.message)
  await syncCourseLessonStats(courseId)
}

export async function duplicateLesson(
  courseId: string,
  lessonId: string
): Promise<{ lessonId: string }> {
  const admin = createAdminClient()
  const { data: source, error } = await admin
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .single()

  if (error || !source) throw new Error('not_found')

  const newLessonId = randomUUID()
  const slug = await ensureUniqueLessonSlug(`${source.title} Copy`, newLessonId, courseId)

  const { data: existing } = await admin
    .from('lessons')
    .select('order_index')
    .eq('section_id', source.section_id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0

  const { id: _id, slug: _s, video_asset_id: _v, ...rest } = source
  const { data, error: insertErr } = await admin
    .from('lessons')
    .insert({
      ...rest,
      id: newLessonId,
      slug,
      title: `${source.title} (Copy)`,
      title_ar: `${source.title_ar} (نسخة)`,
      video_asset_id: null,
      order_index: nextIndex,
    })
    .select('id')
    .single()

  if (insertErr || !data) throw new Error(insertErr?.message ?? 'insert_failed')
  await syncCourseLessonStats(courseId)
  return { lessonId: data.id as string }
}

export async function moveLesson(
  courseId: string,
  lessonId: string,
  targetSectionId: string,
  orderIndex: number
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('lessons')
    .update({ section_id: targetSectionId, order_index: orderIndex })
    .eq('id', lessonId)
    .eq('course_id', courseId)
  if (error) throw new Error(error.message)
  await syncCourseLessonStats(courseId)
}

export async function reorderLessons(
  courseId: string,
  sectionId: string,
  lessonIds: string[]
): Promise<void> {
  const admin = createAdminClient()
  for (let i = 0; i < lessonIds.length; i++) {
    const { error } = await admin
      .from('lessons')
      .update({ order_index: i, section_id: sectionId })
      .eq('id', lessonIds[i])
      .eq('course_id', courseId)
    if (error) throw new Error(error.message)
  }
  await syncCourseLessonStats(courseId)
}

export async function setLessonLocked(
  courseId: string,
  lessonId: string,
  locked: boolean
): Promise<void> {
  await updateLesson(courseId, lessonId, { is_mandatory: locked })
}

export async function unlinkLessonVideo(courseId: string, lessonId: string): Promise<void> {
  await updateLesson(courseId, lessonId, { video_asset_id: null })
}
