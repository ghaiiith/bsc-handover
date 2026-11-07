import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { CourseResource, ResourceAddedSource, ResourceCategory, ResourceUrlAccessMode } from '@/types'

export interface LessonResourceRow extends CourseResource {
  lesson_title?: string | null
  lesson_title_ar?: string | null
  added_by_name?: string | null
}

type RawResource = {
  id: string
  course_id: string
  lesson_id: string | null
  title: string
  title_ar: string | null
  file_url: string
  file_type: string
  category: string
  folder: string
  file_size_bytes: number | null
  url_access_mode: string | null
  added_source: ResourceAddedSource
  added_by: string | null
  created_at: string
  lessons?: { title: string; title_ar: string } | { title: string; title_ar: string }[] | null
}

const RESOURCE_SELECT = `
  id,
  course_id,
  lesson_id,
  title,
  title_ar,
  file_url,
  file_type,
  category,
  folder,
  file_size_bytes,
  url_access_mode,
  added_source,
  added_by,
  created_at,
  lessons(title, title_ar)
`

function mapResource(row: RawResource, names: Map<string, string>): LessonResourceRow {
  const lesson = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons

  return {
    id: row.id,
    course_id: row.course_id,
    lesson_id: row.lesson_id,
    title: row.title,
    title_ar: row.title_ar,
    file_url: row.file_url,
    file_type: row.file_type,
    category: row.category as ResourceCategory,
    folder: row.folder,
    file_size_bytes: row.file_size_bytes ?? 0,
    url_access_mode: (row.url_access_mode as ResourceUrlAccessMode | null) ?? 'download',
    added_source: row.added_source ?? 'studio',
    added_by: row.added_by,
    created_at: row.created_at,
    lesson_title: lesson?.title ?? null,
    lesson_title_ar: lesson?.title_ar ?? null,
    added_by_name: row.added_by ? names.get(row.added_by) ?? null : null,
  }
}

async function loadAddedByNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: RawResource[]
): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.added_by).filter(Boolean))] as string[]
  if (ids.length === 0) return new Map()

  const { data: users } = await supabase.from('users').select('id, full_name').in('id', ids)
  return new Map((users ?? []).map((u) => [u.id as string, (u.full_name as string) ?? '']))
}

export async function getLessonResources(
  courseId: string,
  lessonId: string
): Promise<LessonResourceRow[]> {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('course_resources')
    .select(RESOURCE_SELECT)
    .eq('course_id', courseId)
    .or(`lesson_id.eq.${lessonId},lesson_id.is.null`)
    .order('created_at', { ascending: false })

  const raw = (rows ?? []) as RawResource[]
  return raw.map((row) => mapResource(row, new Map()))
}

export async function getCourseResourceLog(
  courseId: string,
  instructorId: string
): Promise<LessonResourceRow[]> {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('instructor_id', instructorId)
    .maybeSingle()

  if (!course) return []

  const { data: rows } = await supabase
    .from('course_resources')
    .select(RESOURCE_SELECT)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  const raw = (rows ?? []) as RawResource[]
  const names = await loadAddedByNames(supabase, raw)
  return raw.map((row) => mapResource(row, names))
}
