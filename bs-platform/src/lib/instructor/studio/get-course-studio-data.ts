import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCourseForEdit } from '@/lib/instructor/get-course-for-edit'
import { formatPrice } from '@/lib/format-number'
import type { Course, User } from '@/types'
import type { SectionWithLessons } from '@/lib/courses/lesson-utils'

export interface StudioOverviewMetrics {
  totalStudents: number
  revenue: number
  completionRate: number
  averageRating: number
  activeStudents: number
  totalLessons: number
  totalReviews: number
}

export interface StudioEnrollmentRow {
  id: string
  student: Pick<User, 'id' | 'full_name' | 'full_name_ar' | 'avatar_url'>
  enrolledAt: string
  amount: number
}

export interface StudioReviewRow {
  id: string
  reviewer_id: string
  target_type: 'course' | 'service'
  target_id: string
  rating: number
  comment?: string
  created_at: string
  instructor_reply?: string
  instructor_reply_at?: string
  reviewer?: Pick<User, 'id' | 'full_name' | 'full_name_ar' | 'avatar_url'>
}

export interface StudioStudentRow {
  id: string
  student: Pick<User, 'id' | 'full_name' | 'full_name_ar' | 'avatar_url'>
  enrolledAt: string
  progressPercent: number
  completedLessons: number
  totalLessons: number
  lastActivity: string | null
  status: 'active' | 'inactive' | 'completed' | 'at_risk'
}

export interface StudioAnalytics {
  enrollmentsByMonth: { month: string; count: number }[]
  revenueByMonth: { month: string; amount: number }[]
  lessonCompletionRates: { lessonId: string; title: string; rate: number }[]
  topStudents: { name: string; progress: number }[]
  bottomStudents: { name: string; progress: number }[]
}

export interface CourseStudioContext {
  course: Course
  sections: SectionWithLessons[]
}

export async function getCourseStudioContext(
  courseId: string,
  instructorId: string
): Promise<CourseStudioContext | null> {
  return getCourseForEdit(courseId, instructorId)
}

export async function getStudioOverview(
  courseId: string,
  instructorId: string
): Promise<{
  metrics: StudioOverviewMetrics
  recentEnrollments: StudioEnrollmentRow[]
  recentReviews: StudioReviewRow[]
} | null> {
  const ctx = await getCourseStudioContext(courseId, instructorId)
  if (!ctx) return null

  const supabase = await createClient()
  const admin = createAdminClient()
  const totalLessons = ctx.course.total_lessons || 0

  const lessonIds = ctx.sections.flatMap((s) => (s.lessons ?? []).map((l) => l.id))

  const [
    enrollmentsRes,
    paymentsRes,
    reviewsRes,
    progressRes,
    recentEnrollmentsRes,
    recentReviewsRes,
  ] = await Promise.all([
    admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId),
    admin
      .from('payments')
      .select('amount')
      .eq('course_id', courseId)
      .eq('status', 'completed'),
    supabase
      .from('reviews')
      .select('rating')
      .eq('target_type', 'course')
      .eq('target_id', courseId),
    lessonIds.length > 0
      ? supabase
          .from('lesson_progress')
          .select('student_id, completed, lesson_id')
          .in('lesson_id', lessonIds)
      : Promise.resolve({ data: [] as { student_id: string; completed: boolean }[] }),
    admin
      .from('enrollments')
      .select(
        `id, enrolled_at,
        student:users!student_id(id, full_name, full_name_ar, avatar_url)`
      )
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false })
      .limit(5),
    supabase
      .from('reviews')
      .select(
        `*, reviewer:users!reviewer_id(id, full_name, full_name_ar, avatar_url)`
      )
      .eq('target_type', 'course')
      .eq('target_id', courseId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalStudents = enrollmentsRes.count ?? 0
  const revenue = (paymentsRes.data ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )
  const ratings = (reviewsRes.data ?? []).map((r) => r.rating as number)
  const averageRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

  const progressRows = progressRes.data ?? []
  const studentProgress = new Map<string, number>()
  for (const row of progressRows) {
    const sid = row.student_id as string
    if (!studentProgress.has(sid)) studentProgress.set(sid, 0)
    if (row.completed) studentProgress.set(sid, (studentProgress.get(sid) ?? 0) + 1)
  }

  let completedStudents = 0
  for (const completed of studentProgress.values()) {
    if (totalLessons > 0 && completed >= totalLessons) completedStudents++
  }

  const completionRate =
    totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0

  const activeStudents = [...studentProgress.values()].filter((c) => c > 0).length

  const recentEnrollments: StudioEnrollmentRow[] = (recentEnrollmentsRes.data ?? []).map(
    (row) => {
      const student = row.student as unknown as StudioEnrollmentRow['student']
      return {
        id: row.id as string,
        student,
        enrolledAt: row.enrolled_at as string,
        amount: ctx.course.price ?? 0,
      }
    }
  )

  const recentReviews = (recentReviewsRes.data ?? []) as StudioReviewRow[]

  return {
    metrics: {
      totalStudents,
      revenue,
      completionRate,
      averageRating,
      activeStudents,
      totalLessons,
      totalReviews: ratings.length,
    },
    recentEnrollments,
    recentReviews,
  }
}

export async function getStudioStudents(
  courseId: string,
  instructorId: string
): Promise<StudioStudentRow[] | null> {
  const ctx = await getCourseStudioContext(courseId, instructorId)
  if (!ctx) return null

  const admin = createAdminClient()
  const totalLessons = ctx.course.total_lessons || 0

  const { data: enrollments, error: enrollmentsError } = await admin
    .from('enrollments')
    .select(
      `id, enrolled_at,
      student:users!student_id(id, full_name, full_name_ar, avatar_url)`
    )
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false })

  if (enrollmentsError) {
    console.error('[getStudioStudents] enrollments:', enrollmentsError.message)
    return []
  }

  if (!enrollments?.length) return []

  const validEnrollments = enrollments.filter((e) => e.student != null)
  if (!validEnrollments.length) return []

  const studentIds = validEnrollments.map((e) => {
    const student = e.student as unknown as { id: string }
    return student.id
  })

  const lessonIds = ctx.sections.flatMap((s) => (s.lessons ?? []).map((l) => l.id))

  const { data: progressRows } =
    lessonIds.length > 0
      ? await admin
          .from('lesson_progress')
          .select('student_id, completed, completed_at, lesson_id')
          .in('lesson_id', lessonIds)
          .in('student_id', studentIds)
      : { data: [] }

  const progressMap = new Map<string, { completed: number; lastActivity: string | null }>()
  for (const row of progressRows ?? []) {
    const sid = row.student_id as string
    if (!progressMap.has(sid)) progressMap.set(sid, { completed: 0, lastActivity: null })
    const entry = progressMap.get(sid)!
    if (row.completed) entry.completed++
    const at = row.completed_at as string | null
    if (at && (!entry.lastActivity || at > entry.lastActivity)) {
      entry.lastActivity = at
    }
  }

  const now = Date.now()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000

  return validEnrollments.map((enrollment) => {
    const student = enrollment.student as unknown as StudioStudentRow['student']
    const sid = student.id
    const prog = progressMap.get(sid) ?? { completed: 0, lastActivity: null }
    const progressPercent =
      totalLessons > 0 ? Math.round((prog.completed / totalLessons) * 100) : 0

    let status: StudioStudentRow['status'] = 'active'
    if (progressPercent >= 100) status = 'completed'
    else if (
      !prog.lastActivity ||
      now - new Date(prog.lastActivity).getTime() > thirtyDays
    ) {
      status = prog.completed === 0 ? 'inactive' : 'at_risk'
    }

    return {
      id: enrollment.id as string,
      student,
      enrolledAt: enrollment.enrolled_at as string,
      progressPercent,
      completedLessons: prog.completed,
      totalLessons,
      lastActivity: prog.lastActivity,
      status,
    }
  })
}

export async function getStudioReviews(
  courseId: string,
  instructorId: string
): Promise<{ reviews: StudioReviewRow[]; averageRating: number; distribution: number[] } | null> {
  const ctx = await getCourseStudioContext(courseId, instructorId)
  if (!ctx) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select(
      `*, reviewer:users!reviewer_id(id, full_name, full_name_ar, avatar_url)`
    )
    .eq('target_type', 'course')
    .eq('target_id', courseId)
    .order('created_at', { ascending: false })

  const reviews = (data ?? []) as StudioReviewRow[]
  const distribution = [0, 0, 0, 0, 0]
  let sum = 0
  for (const review of reviews) {
    const idx = Math.min(5, Math.max(1, review.rating)) - 1
    distribution[idx]++
    sum += review.rating
  }

  return {
    reviews,
    averageRating: reviews.length ? sum / reviews.length : 0,
    distribution,
  }
}

export async function getStudioAnalytics(
  courseId: string,
  instructorId: string
): Promise<StudioAnalytics | null> {
  const ctx = await getCourseStudioContext(courseId, instructorId)
  if (!ctx) return null

  const admin = createAdminClient()

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('enrolled_at')
    .eq('course_id', courseId)

  const { data: payments } = await admin
    .from('payments')
    .select('amount, created_at')
    .eq('course_id', courseId)
    .eq('status', 'completed')

  const monthKey = (d: string) => {
    const date = new Date(d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const enrollmentMap = new Map<string, number>()
  for (const e of enrollments ?? []) {
    const key = monthKey(e.enrolled_at as string)
    enrollmentMap.set(key, (enrollmentMap.get(key) ?? 0) + 1)
  }

  const revenueMap = new Map<string, number>()
  for (const p of payments ?? []) {
    const key = monthKey(p.created_at as string)
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(p.amount))
  }

  const students = await getStudioStudents(courseId, instructorId)
  const sorted = [...(students ?? [])].sort((a, b) => b.progressPercent - a.progressPercent)

  const isAr = false
  const lessonRates = ctx.sections.flatMap((section) =>
    (section.lessons ?? []).map((lesson) => ({
      lessonId: lesson.id,
      title: isAr ? lesson.title_ar : lesson.title,
      rate: 0,
    }))
  )

  return {
    enrollmentsByMonth: [...enrollmentMap.entries()].map(([month, count]) => ({
      month,
      count,
    })),
    revenueByMonth: [...revenueMap.entries()].map(([month, amount]) => ({ month, amount })),
    lessonCompletionRates: lessonRates.slice(0, 8),
    topStudents: sorted.slice(0, 5).map((s) => ({
      name: s.student.full_name,
      progress: s.progressPercent,
    })),
    bottomStudents: sorted
      .slice(-5)
      .reverse()
      .map((s) => ({ name: s.student.full_name, progress: s.progressPercent })),
  }
}

export function formatStudioRevenue(amount: number): string {
  return formatPrice(amount)
}
