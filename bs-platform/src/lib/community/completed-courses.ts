import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export async function getCompletedCoursesCounts(
  admin: SupabaseClient,
  userIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (userIds.length === 0) return counts

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('student_id, course_id, courses(id, status)')
    .in('student_id', userIds)

  if (!enrollments?.length) return counts

  const byUser = new Map<string, string[]>()
  for (const row of enrollments) {
    const course = row.courses as unknown as { id: string; status: string } | null
    if (!course || course.status !== 'published') continue
    const list = byUser.get(row.student_id as string) ?? []
    list.push(course.id)
    byUser.set(row.student_id as string, list)
  }

  const allCourseIds = [...new Set([...byUser.values()].flat())]
  if (allCourseIds.length === 0) return counts

  const [{ data: allLessons }, { data: allProgress }] = await Promise.all([
    admin.from('lessons').select('id, course_id').in('course_id', allCourseIds),
    admin
      .from('lesson_progress')
      .select('student_id, lesson_id')
      .in('student_id', userIds)
      .eq('completed', true),
  ])

  const lessonsByCourse = new Map<string, string[]>()
  for (const lesson of allLessons ?? []) {
    const cid = lesson.course_id as string
    const list = lessonsByCourse.get(cid) ?? []
    list.push(lesson.id as string)
    lessonsByCourse.set(cid, list)
  }

  const progressByUser = new Map<string, Set<string>>()
  for (const p of allProgress ?? []) {
    const uid = p.student_id as string
    const set = progressByUser.get(uid) ?? new Set()
    set.add(p.lesson_id as string)
    progressByUser.set(uid, set)
  }

  for (const [userId, courseIds] of byUser) {
    const completedSet = progressByUser.get(userId) ?? new Set()
    let completed = 0
    for (const courseId of courseIds) {
      const lessonIds = lessonsByCourse.get(courseId) ?? []
      if (lessonIds.length > 0 && lessonIds.every((id) => completedSet.has(id))) {
        completed += 1
      }
    }
    counts.set(userId, completed)
  }

  return counts
}

export async function getCvUserIds(
  admin: SupabaseClient,
  userIds: string[]
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()
  const { data } = await admin.from('cv_profiles').select('user_id').in('user_id', userIds)
  return new Set((data ?? []).map((r) => r.user_id as string))
}
