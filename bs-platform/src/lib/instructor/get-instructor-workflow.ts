import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatRelativeTime } from '@/lib/format-relative-time'

export interface InstructorAttentionItem {
  id: string
  type: 'certificate_review' | 'enrollment' | 'order'
  title: string
  subtitle: string
  href: string
  createdAt: string
  timeLabel: string
  priority: 'high' | 'normal'
}

export interface InstructorWorkflowData {
  attentionItems: InstructorAttentionItem[]
  pendingCertificates: number
  recentEnrollments: number
  monthlyEarnings: number
  hasCourses: boolean
}

export async function getInstructorWorkflowData(
  instructorId: string,
  locale: string
): Promise<InstructorWorkflowData> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const isAr = locale === 'ar'

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, title_ar, slug')
    .eq('instructor_id', instructorId)

  const courseIds = (courses ?? []).map((c) => c.id as string)
  const courseMap = new Map(
    (courses ?? []).map((c) => [c.id as string, c])
  )

  if (courseIds.length === 0) {
    return {
      attentionItems: [],
      pendingCertificates: 0,
      recentEnrollments: 0,
      monthlyEarnings: 0,
      hasCourses: false,
    }
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { data: pendingSubmissions },
    { data: recentEnrollments },
    { data: monthlyPayments },
    { count: pendingOrderCount },
  ] = await Promise.all([
    admin
      .from('final_exam_submissions')
      .select('id, course_id, created_at, student:users!student_id(full_name, full_name_ar)')
      .in('course_id', courseIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('enrollments')
      .select('id, course_id, enrolled_at, student:users!student_id(full_name, full_name_ar)')
      .in('course_id', courseIds)
      .gte('enrolled_at', thirtyDaysAgo.toISOString())
      .order('enrolled_at', { ascending: false })
      .limit(5),
    admin
      .from('payments')
      .select('amount')
      .in('course_id', courseIds)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    admin
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', instructorId)
      .eq('status', 'pending'),
  ])

  const attentionItems: InstructorAttentionItem[] = []

  for (const sub of pendingSubmissions ?? []) {
    const course = courseMap.get(sub.course_id as string)
    const studentRaw = sub.student
    const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw
    const studentName = isAr
      ? student?.full_name_ar ?? student?.full_name ?? '—'
      : student?.full_name ?? '—'
    const courseTitle = isAr ? course?.title_ar : course?.title

    attentionItems.push({
      id: `cert-${sub.id}`,
      type: 'certificate_review',
      title: isAr ? 'موافقة على شهادة' : 'Certificate approval',
      subtitle: `${studentName} · ${courseTitle ?? '—'}`,
      href: `/${locale}/instructor/certificate-requests`,
      createdAt: sub.created_at as string,
      timeLabel: formatRelativeTime(sub.created_at as string, locale),
      priority: 'high',
    })
  }

  for (const enrollment of recentEnrollments ?? []) {
    const course = courseMap.get(enrollment.course_id as string)
    const studentRaw = enrollment.student
    const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw
    const studentName = isAr
      ? student?.full_name_ar ?? student?.full_name ?? '—'
      : student?.full_name ?? '—'
    const courseTitle = isAr ? course?.title_ar : course?.title

    attentionItems.push({
      id: `enroll-${enrollment.id}`,
      type: 'enrollment',
      title: isAr ? 'تسجيل جديد' : 'New enrollment',
      subtitle: `${studentName} · ${courseTitle ?? '—'}`,
      href: `/${locale}/instructor/courses/${enrollment.course_id}/studio/students`,
      createdAt: enrollment.enrolled_at as string,
      timeLabel: formatRelativeTime(enrollment.enrolled_at as string, locale),
      priority: 'normal',
    })
  }

  if ((pendingOrderCount ?? 0) > 0) {
    attentionItems.push({
      id: 'orders-pending',
      type: 'order',
      title: isAr ? 'طلبات خدمة معلقة' : 'Pending service orders',
      subtitle: isAr
        ? `${pendingOrderCount} طلب يحتاج ردك`
        : `${pendingOrderCount} order(s) need your response`,
      href: `/${locale}/dashboard/orders/incoming?status=pending`,
      createdAt: new Date().toISOString(),
      timeLabel: '',
      priority: 'high',
    })
  }

  attentionItems.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const monthlyEarnings = (monthlyPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )

  return {
    attentionItems: attentionItems.slice(0, 5),
    pendingCertificates: pendingSubmissions?.length ?? 0,
    recentEnrollments: recentEnrollments?.length ?? 0,
    monthlyEarnings,
    hasCourses: true,
  }
}
