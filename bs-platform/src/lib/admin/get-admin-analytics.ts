import { createAdminClient } from '@/lib/supabase/admin'
import { getCourseCategories } from '@/lib/admin/categories'

type RawCourseRel =
  | { instructor_id: string | null }
  | { instructor_id: string | null }[]
  | null

function unwrapInstructorId(course: RawCourseRel): string | null {
  if (!course) return null
  const row = Array.isArray(course) ? course[0] : course
  return row?.instructor_id ?? null
}

export type AnalyticsRange = '7d' | '30d' | '3m' | '1y' | 'custom'

export interface AnalyticsParams {
  range?: AnalyticsRange
  from?: string
  to?: string
}

export interface RevenuePoint {
  date: string
  total: number
  commission: number
  instructorNet: number
}

export interface UserGrowthPoint {
  date: string
  count: number
}

export interface TopCourse {
  id: string
  title: string
  title_ar: string
  enrollments: number
  revenue: number
}

export interface CategoryRevenue {
  category: string
  revenue: number
  percentage: number
}

export interface PaymentMethodStat {
  method: string
  amount: number
  count: number
  percentage: number
}

export interface AnalyticsSummary {
  avgCoursePrice: number
  avgRevenuePerInstructor: number
  topCategory: string
  topInstructor: { name: string; earnings: number } | null
  peakEnrollmentDay: string
}

export interface AnalyticsData {
  revenue: RevenuePoint[]
  userGrowth: UserGrowthPoint[]
  topCourses: TopCourse[]
  categoryRevenue: CategoryRevenue[]
  paymentMethods: PaymentMethodStat[]
  summary: AnalyticsSummary
}

function getDateRange(params: AnalyticsParams): { start: Date; end: Date } {
  const end = params.to ? new Date(params.to) : new Date()
  end.setHours(23, 59, 59, 999)

  const start = new Date(end)
  if (params.from) {
    start.setTime(new Date(params.from).getTime())
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }

  const range = params.range ?? '30d'
  if (range === '7d') start.setDate(end.getDate() - 6)
  else if (range === '30d') start.setDate(end.getDate() - 29)
  else if (range === '3m') start.setMonth(end.getMonth() - 3)
  else start.setFullYear(end.getFullYear() - 1)

  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function dateKeys(start: Date, end: Date): string[] {
  const keys: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    keys.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return keys
}

export async function getAdminAnalytics(
  params: AnalyticsParams = {}
): Promise<AnalyticsData> {
  const admin = createAdminClient()
  const { start, end } = getDateRange(params)
  const keys = dateKeys(start, end)
  const { data: payments } = await admin
    .from('payments')
    .select(`
      amount, method, status, created_at, course_id,
      gross_amount, gateway_total_fee, net_received_amount,
      platform_revenue, instructor_revenue, financial_snapshot_at,
      course:courses(instructor_id)
    `)
    .eq('status', 'completed')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const paymentRows = payments ?? []

  const totalMap = new Map(keys.map((k) => [k, 0]))
  const commissionMap = new Map(keys.map((k) => [k, 0]))
  const gatewayMap = new Map(keys.map((k) => [k, 0]))
  const instructorMap = new Map(keys.map((k) => [k, 0]))

  paymentRows.forEach((p) => {
    const key = (p.created_at as string).slice(0, 10)
    if (!totalMap.has(key)) return
    if (!p.financial_snapshot_at) return

    const gross = Number(p.gross_amount ?? p.amount)
    totalMap.set(key, (totalMap.get(key) ?? 0) + gross)
    commissionMap.set(key, (commissionMap.get(key) ?? 0) + Number(p.platform_revenue ?? 0))
    gatewayMap.set(key, (gatewayMap.get(key) ?? 0) + Number(p.gateway_total_fee ?? 0))
    instructorMap.set(
      key,
      (instructorMap.get(key) ?? 0) + Number(p.instructor_revenue ?? 0)
    )
  })

  const revenue: RevenuePoint[] = keys.map((date) => {
    const total = totalMap.get(date) ?? 0
    const commission = Math.round(commissionMap.get(date) ?? 0)
    const instructorNet = Math.round(instructorMap.get(date) ?? 0)
    return { date, total, commission, instructorNet }
  })

  const { data: users } = await admin
    .from('users')
    .select('created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const userMap = new Map(keys.map((k) => [k, 0]))
  ;(users ?? []).forEach((u) => {
    const key = (u.created_at as string).slice(0, 10)
    if (userMap.has(key)) userMap.set(key, (userMap.get(key) ?? 0) + 1)
  })

  const userGrowth: UserGrowthPoint[] = keys.map((date) => ({
    date,
    count: userMap.get(date) ?? 0,
  }))

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('course_id, course:courses(id, title, title_ar, price, category, instructor_id)')

  const courseStats = new Map<string, TopCourse & { category: string }>()
  ;(enrollments ?? []).forEach((e) => {
    const course = Array.isArray(e.course) ? e.course[0] : e.course
    if (!course) return
    const existing = courseStats.get(course.id) ?? {
      id: course.id,
      title: course.title,
      title_ar: course.title_ar,
      enrollments: 0,
      revenue: 0,
      category: course.category,
    }
    existing.enrollments += 1
    existing.revenue += Number(course.price ?? 0)
    courseStats.set(course.id, existing)
  })

  const topCourses = Array.from(courseStats.values())
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 10)
    .map(({ category: _category, ...rest }) => rest)

  const categoryTotals = new Map<string, number>()
  courseStats.forEach((c) => {
    categoryTotals.set(c.category, (categoryTotals.get(c.category) ?? 0) + c.revenue)
  })
  const catTotal = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0) || 1
  const categoryRevenue: CategoryRevenue[] = Array.from(categoryTotals.entries()).map(
    ([category, revenue]) => ({
      category,
      revenue,
      percentage: Math.round((revenue / catTotal) * 100),
    })
  )

  const methodTotals = new Map<string, { amount: number; count: number }>()
  ;(payments ?? []).forEach((p) => {
    const m = p.method as string
    const cur = methodTotals.get(m) ?? { amount: 0, count: 0 }
    cur.amount += Number(p.amount)
    cur.count += 1
    methodTotals.set(m, cur)
  })
  const methodTotal = Array.from(methodTotals.values()).reduce((s, m) => s + m.amount, 0) || 1
  const paymentMethods: PaymentMethodStat[] = Array.from(methodTotals.entries()).map(
    ([method, { amount, count }]) => ({
      method,
      amount,
      count,
      percentage: Math.round((amount / methodTotal) * 100),
    })
  )

  const { data: publishedCourses } = await admin
    .from('courses')
    .select('price')
    .eq('status', 'published')

  const prices = (publishedCourses ?? []).map((c) => Number(c.price))
  const avgCoursePrice = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0

  const { data: instructors } = await admin
    .from('users')
    .select('id, full_name')
    .eq('role', 'instructor')

  const instructorEarnings = new Map<string, number>()

  const { data: coursePayments } = await admin
    .from('payments')
    .select('amount, instructor_revenue, financial_snapshot_at, course:courses(instructor_id)')
    .eq('status', 'completed')

  ;(coursePayments ?? []).forEach((p) => {
    const instructorId = unwrapInstructorId(p.course as RawCourseRel)
    if (!instructorId || !p.financial_snapshot_at) return
    const net = Number(p.instructor_revenue ?? 0)
    instructorEarnings.set(
      instructorId,
      (instructorEarnings.get(instructorId) ?? 0) + net
    )
  })

  const instructorCount = instructors?.length ?? 0
  const totalInstructorEarnings = Array.from(instructorEarnings.values()).reduce(
    (a, b) => a + b,
    0
  )
  const avgRevenuePerInstructor = instructorCount
    ? Math.round(totalInstructorEarnings / instructorCount)
    : 0

  let topInstructor: AnalyticsSummary['topInstructor'] = null
  instructorEarnings.forEach((earnings, id) => {
    const inst = instructors?.find((i) => i.id === id)
    if (!inst) return
    if (!topInstructor || earnings > topInstructor.earnings) {
      topInstructor = { name: inst.full_name, earnings: Math.round(earnings) }
    }
  })

  const topCategory =
    categoryRevenue.sort((a, b) => b.revenue - a.revenue)[0]?.category ?? 'other'
  const courseCategories = await getCourseCategories()

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayCounts = new Array(7).fill(0)
  const { data: allEnrollments } = await admin.from('enrollments').select('enrolled_at')
  ;(allEnrollments ?? []).forEach((e) => {
    dayCounts[new Date(e.enrolled_at as string).getDay()] += 1
  })
  const peakDay = dayCounts.indexOf(Math.max(...dayCounts))

  return {
    revenue,
    userGrowth,
    topCourses,
    categoryRevenue,
    paymentMethods,
    summary: {
      avgCoursePrice,
      avgRevenuePerInstructor,
      topCategory:
        courseCategories.find((c) => c.value === topCategory)?.labelEn ?? topCategory,
      topInstructor,
      peakEnrollmentDay: dayNames[peakDay] ?? 'Mon',
    },
  }
}

export function parseAnalyticsParams(
  searchParams: Record<string, string | string[] | undefined>
): AnalyticsParams {
  const range = searchParams.range
  const valid: AnalyticsRange[] = ['7d', '30d', '3m', '1y', 'custom']
  return {
    range:
      typeof range === 'string' && valid.includes(range as AnalyticsRange)
        ? (range as AnalyticsRange)
        : '30d',
    from: typeof searchParams.from === 'string' ? searchParams.from : undefined,
    to: typeof searchParams.to === 'string' ? searchParams.to : undefined,
  }
}
