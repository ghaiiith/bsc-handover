import { createAdminClient } from '@/lib/supabase/admin'

export interface AdminOverviewStats {
  totalUsers: number
  totalCourses: number
  totalRevenue: number
  activeJobs: number
  pendingCourses: number
  pendingInstructorRequests: number
  pendingCompanyRequests: number
  pendingFreelancerRequests: number
  pendingRoleRequests: number
  pendingServiceOrders: number
}

export interface ActivityItem {
  id: string
  type:
    | 'user_registered'
    | 'enrollment'
    | 'instructor_request'
    | 'course_submitted'
    | 'job_posted'
    | 'service_order'
  textAr: string
  textEn: string
  createdAt: string
}

export interface RevenueChartPoint {
  date: string
  commission: number
  total: number
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const admin = createAdminClient()

  const [
    usersRes,
    coursesRes,
    paymentsRes,
    jobsRes,
    pendingCoursesRes,
    instructorRequestsRes,
    companyRequestsRes,
    freelancerRequestsRes,
    ordersRes,
  ] = await Promise.all([
    admin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'admin'),
    admin
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
    admin.from('payments').select('amount').eq('status', 'completed'),
    admin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('instructor_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('company_affiliation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('freelancer_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const gross = (paymentsRes.data ?? []).reduce(
    (s, p) => s + Number(p.amount),
    0
  )

  const pendingInstructorRequests = instructorRequestsRes.count ?? 0
  const pendingCompanyRequests = companyRequestsRes.count ?? 0
  const pendingFreelancerRequests = freelancerRequestsRes.error
    ? 0
    : freelancerRequestsRes.count ?? 0

  return {
    totalUsers: usersRes.count ?? 0,
    totalCourses: coursesRes.count ?? 0,
    totalRevenue: gross,
    activeJobs: jobsRes.count ?? 0,
    pendingCourses: pendingCoursesRes.count ?? 0,
    pendingInstructorRequests,
    pendingCompanyRequests,
    pendingFreelancerRequests,
    pendingRoleRequests:
      pendingInstructorRequests + pendingCompanyRequests + pendingFreelancerRequests,
    pendingServiceOrders: ordersRes.count ?? 0,
  }
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

export async function getAdminRecentActivity(): Promise<ActivityItem[]> {
  const admin = createAdminClient()
  const items: ActivityItem[] = []

  const { data: users } = await admin
    .from('users')
    .select('id, full_name, full_name_ar, created_at')
    .neq('role', 'admin')
    .order('created_at', { ascending: false })
    .limit(5)

  ;(users ?? []).forEach((u) => {
    const name = u.full_name_ar ?? u.full_name
    items.push({
      id: `user-${u.id}`,
      type: 'user_registered',
      textAr: `مستخدم جديد: ${name} انضم للمنصة`,
      textEn: `New user: ${u.full_name} joined the platform`,
      createdAt: u.created_at as string,
    })
  })

  const { data: enrollments } = await admin
    .from('enrollments')
    .select(`
      id, enrolled_at,
      student:users(full_name, full_name_ar),
      course:courses(title, title_ar)
    `)
    .order('enrolled_at', { ascending: false })
    .limit(5)

  ;(enrollments ?? []).forEach((e) => {
    const student = unwrap(
      (e as { student: unknown }).student as { full_name: string; full_name_ar?: string } | null
    )
    const course = unwrap(
      (e as { course: unknown }).course as { title: string; title_ar: string } | null
    )
    if (!student || !course) return
    items.push({
      id: `enroll-${e.id}`,
      type: 'enrollment',
      textAr: `${student.full_name_ar ?? student.full_name} اشترك في كورس ${course.title_ar}`,
      textEn: `${student.full_name} enrolled in ${course.title}`,
      createdAt: e.enrolled_at as string,
    })
  })

  const { data: requests } = await admin
    .from('instructor_requests')
    .select('id, created_at, user:users(full_name, full_name_ar)')
    .order('created_at', { ascending: false })
    .limit(5)

  ;(requests ?? []).forEach((r) => {
    const user = unwrap(
      (r as { user: unknown }).user as { full_name: string; full_name_ar?: string } | null
    )
    if (!user) return
    items.push({
      id: `req-${r.id}`,
      type: 'instructor_request',
      textAr: `${user.full_name_ar ?? user.full_name} طلب أن يصبح مدرباً`,
      textEn: `${user.full_name} requested to become an instructor`,
      createdAt: r.created_at as string,
    })
  })

  const { data: courses } = await admin
    .from('courses')
    .select('id, title, title_ar, updated_at')
    .eq('status', 'pending')
    .order('updated_at', { ascending: false })
    .limit(5)

  ;(courses ?? []).forEach((c) => {
    items.push({
      id: `course-${c.id}`,
      type: 'course_submitted',
      textAr: `كورس جديد للمراجعة: ${c.title_ar}`,
      textEn: `New course for review: ${c.title}`,
      createdAt: c.updated_at as string,
    })
  })

  const { data: applications } = await admin
    .from('jobs')
    .select('id, title, title_ar, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5)

  ;(applications ?? []).forEach((j) => {
    items.push({
      id: `job-${j.id}`,
      type: 'job_posted',
      textAr: `وظيفة جديدة: ${j.title_ar}`,
      textEn: `New job posted: ${j.title}`,
      createdAt: j.created_at as string,
    })
  })

  const { data: orders } = await admin
    .from('service_orders')
    .select('id, ordered_at, service:services(title, title_ar)')
    .order('ordered_at', { ascending: false })
    .limit(5)

  ;(orders ?? []).forEach((o) => {
    const service = unwrap(
      (o as { service: unknown }).service as { title: string; title_ar: string } | null
    )
    if (!service) return
    items.push({
      id: `order-${o.id}`,
      type: 'service_order',
      textAr: `طلب خدمة جديد: ${service.title_ar}`,
      textEn: `New service order: ${service.title}`,
      createdAt: o.ordered_at as string,
    })
  })

  return items
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 15)
}

export async function getAdminRevenueChartData(): Promise<RevenueChartPoint[]> {
  const admin = createAdminClient()
  const days = 30
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  const { data: payments } = await admin
    .from('payments')
    .select(`
      amount, created_at, gross_amount, platform_revenue, financial_snapshot_at,
      course:courses(instructor_id)
    `)
    .eq('status', 'completed')
    .gte('created_at', start.toISOString())

  const totalByDate = new Map<string, number>()
  const commissionByDate = new Map<string, number>()

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    totalByDate.set(key, 0)
    commissionByDate.set(key, 0)
  }

  const rows = payments ?? []

  rows.forEach((p) => {
    const key = (p.created_at as string).slice(0, 10)
    if (!totalByDate.has(key) || !p.financial_snapshot_at) return
    const gross = Number(p.gross_amount ?? p.amount)
    totalByDate.set(key, (totalByDate.get(key) ?? 0) + gross)
    commissionByDate.set(
      key,
      (commissionByDate.get(key) ?? 0) + Number(p.platform_revenue ?? 0)
    )
  })

  return Array.from(totalByDate.entries()).map(([date, total]) => ({
    date,
    total,
    commission: Math.round(commissionByDate.get(date) ?? 0),
  }))
}

type RawCourseRel =
  | { instructor_id: string | null }
  | { instructor_id: string | null }[]
  | null
