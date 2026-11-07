import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface InstructorDashboardStats {
  totalCourses: number
  totalStudents: number
  totalEarnings: number
  averageRating: number
}

export interface RecentEnrollmentRow {
  id: string
  studentName: string
  studentNameAr?: string
  courseTitle: string
  courseTitleAr: string
  enrolledAt: string
  amount: number
}

export interface InstructorDashboardData {
  stats: InstructorDashboardStats
  recentEnrollments: RecentEnrollmentRow[]
}

export async function getInstructorDashboardData(
  instructorId: string
): Promise<InstructorDashboardData> {
  const supabase = await createClient()

  const { data: courses, count: totalCourses } = await supabase
    .from('courses')
    .select('id, price', { count: 'exact' })
    .eq('instructor_id', instructorId)

  const courseIds = (courses ?? []).map((course) => course.id as string)

  if (courseIds.length === 0) {
    return {
      stats: {
        totalCourses: 0,
        totalStudents: 0,
        totalEarnings: 0,
        averageRating: 0,
      },
      recentEnrollments: [],
    }
  }

  const admin = createAdminClient()

  const { count: totalStudents } = await admin
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .in('course_id', courseIds)

  const { data: payments } = await admin
    .from('payments')
    .select('instructor_revenue, financial_snapshot_at')
    .in('course_id', courseIds)
    .eq('status', 'completed')

  const totalEarnings = (payments ?? []).reduce((sum, payment) => {
    if (!payment.financial_snapshot_at) return sum
    return sum + Number(payment.instructor_revenue ?? 0)
  }, 0)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('target_type', 'course')
    .in('target_id', courseIds)

  const reviewRatings = (reviews ?? []).map((r) => r.rating as number)
  const averageRating =
    reviewRatings.length > 0
      ? reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length
      : 0

  const { data: enrollmentRows } = await admin
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      student:users(full_name, full_name_ar),
      course:courses(title, title_ar, price),
      payment:payments(amount)
    `)
    .in('course_id', courseIds)
    .order('enrolled_at', { ascending: false })
    .limit(10)

  const recentEnrollments: RecentEnrollmentRow[] = (enrollmentRows ?? []).map(
    (row) => {
      const studentRaw = row.student
      const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw
      const courseRaw = row.course
      const course = Array.isArray(courseRaw) ? courseRaw[0] : courseRaw
      const paymentRaw = row.payment
      const payment = Array.isArray(paymentRaw) ? paymentRaw[0] : paymentRaw

      const amount = payment?.amount != null
        ? Number(payment.amount)
        : Number(course?.price ?? 0)

      return {
        id: row.id as string,
        studentName: student?.full_name ?? '—',
        studentNameAr: student?.full_name_ar,
        courseTitle: course?.title ?? '—',
        courseTitleAr: course?.title_ar ?? '—',
        enrolledAt: row.enrolled_at as string,
        amount,
      }
    }
  )

  return {
    stats: {
      totalCourses: totalCourses ?? courseIds.length,
      totalStudents: totalStudents ?? 0,
      totalEarnings,
      averageRating,
    },
    recentEnrollments,
  }
}
