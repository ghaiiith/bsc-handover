import { createAdminClient } from '@/lib/supabase/admin'

export async function getFirstLessonRef(
  courseId: string
): Promise<{ id: string; slug: string } | null> {
  const admin = createAdminClient()

  const { data: sections } = await admin
    .from('course_sections')
    .select('id, order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })

  if (!sections?.length) return null

  const { data: lessons } = await admin
    .from('lessons')
    .select('id, slug, section_id, order_index')
    .in(
      'section_id',
      sections.map((s) => s.id)
    )
    .order('order_index', { ascending: true })

  if (!lessons?.length) return null

  const sectionOrder = new Map(sections.map((s) => [s.id, s.order_index]))
  const sorted = [...lessons].sort((a, b) => {
    const secA = sectionOrder.get(a.section_id) ?? 0
    const secB = sectionOrder.get(b.section_id) ?? 0
    if (secA !== secB) return secA - secB
    return a.order_index - b.order_index
  })

  const first = sorted[0]
  return first ? { id: first.id as string, slug: first.slug as string } : null
}

/** @deprecated Use getFirstLessonRef */
export async function getFirstLessonId(courseId: string): Promise<string | null> {
  const ref = await getFirstLessonRef(courseId)
  return ref?.id ?? null
}

export async function getCourseEnrollmentContext(courseId: string) {
  const admin = createAdminClient()

  const { data: course } = await admin
    .from('courses')
    .select('id, slug, title, title_ar, thumbnail_url, instructor_id')
    .eq('id', courseId)
    .single()

  if (!course) return null

  const firstLesson = await getFirstLessonRef(courseId)
  return { course, firstLesson }
}
