import 'server-only'

import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncCourseLessonStats } from '@/lib/instructor/course-wizard-actions'
import type { CourseSection, Lesson, VideoAsset } from '@/types'

export interface CurriculumLesson extends Lesson {
  video_asset?: VideoAsset | null
  processing_status?: string
  upload_status?: string
  is_locked?: boolean
  publication_status?: 'draft' | 'published'
}

export interface CurriculumSection extends CourseSection {
  lessons: CurriculumLesson[]
}

export interface CourseCurriculum {
  courseId: string
  sections: CurriculumSection[]
}

function lessonPublicationStatus(lesson: Lesson, asset?: VideoAsset | null): 'draft' | 'published' {
  if (lesson.lesson_type && lesson.lesson_type !== 'video') return 'published'
  if (asset?.status === 'ready') return 'published'
  return 'draft'
}

export async function getCourseCurriculum(courseId: string): Promise<CourseCurriculum> {
  const admin = createAdminClient()

  const { data: sections, error: secErr } = await admin
    .from('course_sections')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index')

  if (secErr) throw new Error(secErr.message)

  const { data: lessons, error: lesErr } = await admin
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index')

  if (lesErr) throw new Error(lesErr.message)

  const assetIds = (lessons ?? [])
    .map((l) => l.video_asset_id)
    .filter((id): id is string => Boolean(id))

  let assets: VideoAsset[] = []
  if (assetIds.length > 0) {
    const { data } = await admin.from('video_assets').select('*').in('id', assetIds)
    assets = (data ?? []) as VideoAsset[]
  }

  const assetMap = new Map(assets.map((a) => [a.id, a]))

  const sectionsWithLessons: CurriculumSection[] = (sections ?? []).map((section) => ({
    ...(section as CourseSection),
    lessons: (lessons ?? [])
      .filter((l) => l.section_id === section.id)
      .map((lesson) => {
        const asset = lesson.video_asset_id ? assetMap.get(lesson.video_asset_id) : null
        return {
          ...(lesson as Lesson),
          video_asset: asset ?? null,
          processing_status: asset?.status ?? 'none',
          upload_status: asset?.status ?? 'none',
          is_locked: lesson.is_mandatory ?? true,
          publication_status: lessonPublicationStatus(lesson as Lesson, asset),
        }
      }),
  }))

  return { courseId, sections: sectionsWithLessons }
}

export async function createSection(
  courseId: string,
  title: string,
  title_ar: string
): Promise<{ sectionId: string }> {
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('course_sections')
    .select('order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0

  const { data, error } = await admin
    .from('course_sections')
    .insert({
      course_id: courseId,
      title: title.trim(),
      title_ar: title_ar.trim(),
      order_index: nextIndex,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'insert_failed')
  return { sectionId: data.id as string }
}

export async function updateSection(
  courseId: string,
  sectionId: string,
  values: { title?: string; title_ar?: string }
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('course_sections')
    .update(values)
    .eq('id', sectionId)
    .eq('course_id', courseId)
  if (error) throw new Error(error.message)
}

export async function deleteSection(courseId: string, sectionId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('course_sections')
    .delete()
    .eq('id', sectionId)
    .eq('course_id', courseId)
  if (error) throw new Error(error.message)
  await syncCourseLessonStats(courseId)
}

export async function reorderSections(courseId: string, sectionIds: string[]): Promise<void> {
  const admin = createAdminClient()
  for (let i = 0; i < sectionIds.length; i++) {
    const { error } = await admin
      .from('course_sections')
      .update({ order_index: i })
      .eq('id', sectionIds[i])
      .eq('course_id', courseId)
    if (error) throw new Error(error.message)
  }
}
