import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveRevenueAgreement } from '@/lib/revenue/agreements'

/** Payment columns this module reads (course + service revenue alike). */
interface PaymentRow {
  id: string
  amount: number | string | null
  course_id: string | null
  service_order_id: string | null
  user_id: string | null
  created_at: string
  status: string
  method: string
  reference_id: string | null
  gross_amount: number | string | null
  gateway_total_fee: number | string | null
  gateway_percentage: number | string | null
  gateway_fixed_fee: number | string | null
  net_received_amount: number | string | null
  platform_revenue: number | string | null
  instructor_revenue: number | string | null
  instructor_percentage: number | string | null
  platform_percentage: number | string | null
  financial_snapshot_at: string | null
  payout_status: string | null
}

export interface InstructorRevenueStats {
  totalEarnings: number
  totalEnrollments: number
  hasAgreement: boolean
  grossRevenue: number
  totalGatewayFees: number
  totalPlatformCommission: number
}

export interface InstructorCourseRevenue {
  courseId: string
  title: string
  titleAr: string
  enrollments: number
  revenue: number
  avgRating: number
}

export interface InstructorTransaction {
  id: string
  referenceId: string
  studentName: string
  studentNameAr?: string
  courseTitle: string
  courseTitleAr: string
  grossAmount: number
  gatewayFee: number
  gatewayPercentage: number | null
  gatewayFixedFee: number | null
  netReceived: number | null
  platformCommission: number | null
  instructorCommission: number | null
  instructorEarnings: number
  method: string
  date: string
  status: string
  payoutStatus: string
  isLegacy: boolean
}

export interface InstructorRevenueData {
  stats: InstructorRevenueStats
  perCourse: InstructorCourseRevenue[]
  transactions: InstructorTransaction[]
  agreement: {
    platformPercentage: number
    instructorPercentage: number
  } | null
}

export async function getInstructorRevenueData(
  instructorId: string
): Promise<InstructorRevenueData> {
  const supabase = await createClient()
  const agreement = await getActiveRevenueAgreement(instructorId)

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, title_ar, price')
    .eq('instructor_id', instructorId)

  const courseIds = (courses ?? []).map((c) => c.id as string)

  // Report BS-71: a dual-role account (instructor + service provider) earns from
  // BOTH. Pull the service orders they sell so their payments count here too.
  const { data: soldOrders } = await createAdminClient()
    .from('service_orders')
    .select('id, service:services!service_id(title, title_ar)')
    .eq('seller_id', instructorId)
  const serviceOrderIds = (soldOrders ?? []).map((o) => o.id as string)
  const serviceTitleByOrder = new Map<string, { title: string; title_ar: string }>()
  for (const o of soldOrders ?? []) {
    const svc = Array.isArray(o.service) ? o.service[0] : o.service
    serviceTitleByOrder.set(o.id as string, {
      title: (svc?.title as string) ?? '—',
      title_ar: (svc?.title_ar as string) ?? '—',
    })
  }

  if (courseIds.length === 0 && serviceOrderIds.length === 0) {
    return {
      stats: {
        totalEarnings: 0,
        totalEnrollments: 0,
        hasAgreement: agreement !== null,
        grossRevenue: 0,
        totalGatewayFees: 0,
        totalPlatformCommission: 0,
      },
      perCourse: [],
      transactions: [],
      agreement: agreement
        ? {
            platformPercentage: agreement.platform_percentage,
            instructorPercentage: agreement.instructor_percentage,
          }
        : null,
    }
  }

  const admin = createAdminClient()

  const { count: totalEnrollments } = await admin
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .in('course_id', courseIds)

  const paymentColumns = `
      id, amount, course_id, service_order_id, user_id, created_at, status, method, reference_id,
      gross_amount, gateway_total_fee, gateway_percentage, gateway_fixed_fee,
      net_received_amount, platform_revenue, instructor_revenue,
      instructor_percentage, platform_percentage, financial_snapshot_at, payout_status
    `

  const [coursePaymentsRes, servicePaymentsRes] = await Promise.all([
    courseIds.length
      ? admin
          .from('payments')
          .select(paymentColumns)
          .in('course_id', courseIds)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as PaymentRow[] }),
    // Report BS-71: service revenue for this seller.
    serviceOrderIds.length
      ? admin
          .from('payments')
          .select(paymentColumns)
          .in('service_order_id', serviceOrderIds)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as PaymentRow[] }),
  ])

  const completedPayments: PaymentRow[] = [
    ...((coursePaymentsRes.data ?? []) as PaymentRow[]),
    ...((servicePaymentsRes.data ?? []) as PaymentRow[]),
  ].sort(
    (a, b) =>
      new Date(String(b.created_at ?? 0)).getTime() -
      new Date(String(a.created_at ?? 0)).getTime()
  )

  const payments = completedPayments ?? []

  let totalEarnings = 0
  let grossRevenue = 0
  let totalGatewayFees = 0
  let totalPlatformCommission = 0

  for (const p of payments) {
    const gross = Number(p.gross_amount ?? p.amount)
    grossRevenue += gross

    if (p.financial_snapshot_at) {
      totalEarnings += Number(p.instructor_revenue ?? 0)
      totalGatewayFees += Number(p.gateway_total_fee ?? 0)
      totalPlatformCommission += Number(p.platform_revenue ?? 0)
    }
  }

  const { data: freeEnrollments } = await admin
    .from('enrollments')
    .select('course_id, payment_id')
    .in('course_id', courseIds)
    .is('payment_id', null)

  const paidEnrollmentCounts = new Map<string, number>()
  const paidRevenueByCourse = new Map<string, number>()

  payments.forEach((p) => {
    if (p.course_id) {
      paidEnrollmentCounts.set(
        p.course_id,
        (paidEnrollmentCounts.get(p.course_id) ?? 0) + 1
      )
      if (p.financial_snapshot_at) {
        paidRevenueByCourse.set(
          p.course_id,
          (paidRevenueByCourse.get(p.course_id) ?? 0) +
            Number(p.instructor_revenue ?? 0)
        )
      }
    }
  })

  const freeEnrollmentCounts = new Map<string, number>()
  ;(freeEnrollments ?? []).forEach((e) => {
    if (e.course_id) {
      freeEnrollmentCounts.set(
        e.course_id,
        (freeEnrollmentCounts.get(e.course_id) ?? 0) + 1
      )
    }
  })

  const { data: reviews } = await supabase
    .from('reviews')
    .select('target_id, rating')
    .eq('target_type', 'course')
    .in('target_id', courseIds)

  const ratingsByCourse = new Map<string, number[]>()
  ;(reviews ?? []).forEach((r) => {
    const list = ratingsByCourse.get(r.target_id as string) ?? []
    list.push(r.rating as number)
    ratingsByCourse.set(r.target_id as string, list)
  })

  const perCourse: InstructorCourseRevenue[] = (courses ?? []).map((course) => {
    const courseId = course.id as string
    const paidCount = paidEnrollmentCounts.get(courseId) ?? 0
    const freeCount = freeEnrollmentCounts.get(courseId) ?? 0
    const enrollments = paidCount + freeCount
    const revenue = paidRevenueByCourse.get(courseId) ?? 0
    const ratings = ratingsByCourse.get(courseId) ?? []
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
        : 0

    return {
      courseId,
      title: course.title as string,
      titleAr: course.title_ar as string,
      enrollments,
      revenue,
      avgRating,
    }
  })

  perCourse.sort((a, b) => b.revenue - a.revenue)

  const recentPaymentIds = payments.slice(0, 50)
  const studentIds = [...new Set(recentPaymentIds.map((p) => p.user_id).filter(Boolean))]

  const { data: students } = studentIds.length
    ? await supabase
        .from('users')
        .select('id, full_name, full_name_ar')
        .in('id', studentIds as string[])
    : { data: [] }

  const studentMap = new Map(
    (students ?? []).map((s) => [s.id as string, s])
  )

  const courseMap = new Map(
    (courses ?? []).map((c) => [c.id as string, c])
  )

  const transactions: InstructorTransaction[] = recentPaymentIds.map((p) => {
    const student = p.user_id ? studentMap.get(p.user_id) : undefined
    const course = p.course_id ? courseMap.get(p.course_id) : undefined
    // Report BS-71: a service payment has no course — label it with the service.
    const service = p.service_order_id
      ? serviceTitleByOrder.get(p.service_order_id)
      : undefined
    const gross = Number(p.gross_amount ?? p.amount)
    const isLegacy = !p.financial_snapshot_at

    return {
      id: p.id as string,
      referenceId: (p.reference_id as string) ?? '—',
      studentName: student?.full_name ?? '—',
      studentNameAr: student?.full_name_ar,
      courseTitle: (course?.title as string) ?? service?.title ?? '—',
      courseTitleAr: (course?.title_ar as string) ?? service?.title_ar ?? '—',
      grossAmount: gross,
      gatewayFee: Number(p.gateway_total_fee ?? 0),
      gatewayPercentage: p.gateway_percentage != null ? Number(p.gateway_percentage) : null,
      gatewayFixedFee: p.gateway_fixed_fee != null ? Number(p.gateway_fixed_fee) : null,
      netReceived: p.net_received_amount != null ? Number(p.net_received_amount) : null,
      platformCommission: p.platform_revenue != null ? Number(p.platform_revenue) : null,
      instructorCommission:
        p.instructor_percentage != null ? Number(p.instructor_percentage) : null,
      instructorEarnings: isLegacy ? 0 : Number(p.instructor_revenue ?? 0),
      method: p.method as string,
      date: p.created_at as string,
      status: p.status as string,
      payoutStatus: (p.payout_status as string) ?? 'pending',
      isLegacy,
    }
  })

  return {
    stats: {
      totalEarnings,
      totalEnrollments: totalEnrollments ?? 0,
      hasAgreement: agreement !== null,
      grossRevenue,
      totalGatewayFees,
      totalPlatformCommission,
    },
    perCourse,
    transactions,
    agreement: agreement
      ? {
          platformPercentage: agreement.platform_percentage,
          instructorPercentage: agreement.instructor_percentage,
        }
      : null,
  }
}
