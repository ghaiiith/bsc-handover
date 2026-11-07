import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/** Accurate enrollment counts bypassing RLS (server-only). */
export async function countEnrollmentsForCourse(courseId: string): Promise<number> {
  const counts = await getEnrollmentCountsByCourseIds([courseId])
  return counts.get(courseId) ?? 0
}

export async function getEnrollmentCountsByCourseIds(
  courseIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (courseIds.length === 0) return map

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('enrollments')
    .select('course_id')
    .in('course_id', courseIds)

  if (error) {
    console.error('[enrollment-count]', error.message)
    return map
  }

  for (const row of data ?? []) {
    const id = row.course_id as string
    map.set(id, (map.get(id) ?? 0) + 1)
  }

  return map
}

export async function countEnrollmentsForCourses(courseIds: string[]): Promise<number> {
  const counts = await getEnrollmentCountsByCourseIds(courseIds)
  let total = 0
  for (const count of counts.values()) {
    total += count
  }
  return total
}
