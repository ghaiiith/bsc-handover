import 'server-only'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'

import { createAdminClient } from '@/lib/supabase/admin'

export interface SearchResult {
  type: 'course' | 'lesson' | 'section'
  id: string
  courseId: string
  title: string
  titleAr: string
  subtitle?: string
  status?: string
}

export async function globalSearch(query: string, limit = 30): Promise<SearchResult[]> {
  const term = sanitizeSearchTerm(query)
  if (!term) return []

  const admin = createAdminClient()
  const pattern = `%${term}%`

  const [coursesRes, lessonsRes, sectionsRes] = await Promise.all([
    admin
      .from('courses')
      .select('id, title, title_ar, status, slug')
      .or(`title.ilike.${pattern},title_ar.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(limit),
    admin
      .from('lessons')
      .select('id, course_id, title, title_ar, slug')
      .or(`title.ilike.${pattern},title_ar.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(limit),
    admin
      .from('course_sections')
      .select('id, course_id, title, title_ar')
      .or(`title.ilike.${pattern},title_ar.ilike.${pattern}`)
      .limit(limit),
  ])

  const results: SearchResult[] = []

  for (const c of coursesRes.data ?? []) {
    results.push({
      type: 'course',
      id: c.id,
      courseId: c.id,
      title: c.title,
      titleAr: c.title_ar,
      subtitle: c.slug,
      status: c.status,
    })
  }

  for (const l of lessonsRes.data ?? []) {
    results.push({
      type: 'lesson',
      id: l.id,
      courseId: l.course_id,
      title: l.title,
      titleAr: l.title_ar,
      subtitle: l.slug,
    })
  }

  for (const s of sectionsRes.data ?? []) {
    results.push({
      type: 'section',
      id: s.id,
      courseId: s.course_id,
      title: s.title,
      titleAr: s.title_ar,
    })
  }

  return results.slice(0, limit)
}

export async function listInstructors(query?: string) {
  const admin = createAdminClient()
  let request = admin
    .from('users')
    .select('id, full_name, full_name_ar, email')
    .eq('role', 'instructor')
    .eq('is_active', true)
    .order('full_name')
    .limit(30)

  const term = sanitizeSearchTerm(query)
  if (term) {
    request = request.or(`full_name.ilike.%${term}%,full_name_ar.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const { data } = await request
  return data ?? []
}

export async function getRecentActivity(limit = 50) {
  const admin = createAdminClient()

  const [courses, lessons, assets] = await Promise.all([
    admin
      .from('courses')
      .select('id, title, title_ar, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit),
    admin
      .from('lessons')
      .select('id, course_id, title, title_ar, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('video_assets')
      .select('id, course_id, status, original_filename, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit),
  ])

  type ActivityItem = {
    id: string
    type: string
    message: string
    courseId?: string
    createdAt: string
  }

  const items: ActivityItem[] = []

  for (const c of courses.data ?? []) {
    items.push({
      id: `course-${c.id}`,
      type: 'edit',
      message: `Course updated: ${c.title}`,
      courseId: c.id,
      createdAt: c.updated_at,
    })
  }

  for (const l of lessons.data ?? []) {
    items.push({
      id: `lesson-${l.id}`,
      type: 'edit',
      message: `Lesson updated: ${l.title}`,
      courseId: l.course_id,
      createdAt: l.created_at,
    })
  }

  for (const a of assets.data ?? []) {
    items.push({
      id: `asset-${a.id}`,
      type: a.status === 'failed' ? 'failure' : 'upload',
      message: `Video ${a.status}: ${a.original_filename ?? a.id}`,
      courseId: a.course_id ?? undefined,
      createdAt: a.updated_at,
    })
  }

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}
