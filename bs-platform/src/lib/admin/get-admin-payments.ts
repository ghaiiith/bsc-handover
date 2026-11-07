import { createAdminClient } from '@/lib/supabase/admin'
import type { PaymentMethod, PaymentStatus } from '@/types'

export type AdminPaymentStatusFilter = PaymentStatus | 'all'
export type AdminPaymentMethodFilter = PaymentMethod | 'all'

export interface AdminPaymentsParams {
  status?: AdminPaymentStatusFilter
  method?: AdminPaymentMethodFilter
  dateFrom?: string
  dateTo?: string
}

export interface AdminPaymentStats {
  grossRevenue: number
  gatewayExpenses: number
  netRevenue: number
  platformRevenue: number
  instructorRevenue: number
  totalTransactions: number
  successfulPayments: number
  failedPayments: number
  legacyPayments: number
}

export interface AdminPaymentRow {
  id: string
  referenceId: string
  studentName: string
  studentNameAr?: string
  courseTitle: string
  courseTitleAr: string
  instructorName: string
  grossAmount: number
  gatewayFee: number
  netReceived: number | null
  platformRevenue: number | null
  instructorRevenue: number | null
  platformPercentage: number | null
  instructorPercentage: number | null
  method: PaymentMethod
  gatewayType: string | null
  status: PaymentStatus
  payoutStatus: string
  agreementId: string | null
  createdAt: string
  isLegacy: boolean
}

type RawPayment = {
  id: string
  reference_id: string | null
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  created_at: string
  gross_amount: number | null
  gateway_total_fee: number | null
  net_received_amount: number | null
  platform_revenue: number | null
  instructor_revenue: number | null
  platform_percentage: number | null
  instructor_percentage: number | null
  gateway_type: string | null
  agreement_id: string | null
  payout_status: string | null
  financial_snapshot_at: string | null
  user: { full_name: string; full_name_ar?: string } | { full_name: string; full_name_ar?: string }[] | null
  course:
    | { title: string; title_ar: string; instructor: { full_name: string } | { full_name: string }[] | null }
    | { title: string; title_ar: string; instructor: { full_name: string } | { full_name: string }[] | null }[]
    | null
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getAdminPaymentStats(
  params: AdminPaymentsParams = {}
): Promise<AdminPaymentStats> {
  const supabase = createAdminClient()

  let query = supabase
    .from('payments')
    .select(
      'amount, status, gross_amount, gateway_total_fee, net_received_amount, platform_revenue, instructor_revenue, financial_snapshot_at'
    )

  query = applyPaymentFilters(query, params)

  const { data, error } = await query

  if (error || !data) {
    return {
      grossRevenue: 0,
      gatewayExpenses: 0,
      netRevenue: 0,
      platformRevenue: 0,
      instructorRevenue: 0,
      totalTransactions: 0,
      successfulPayments: 0,
      failedPayments: 0,
      legacyPayments: 0,
    }
  }

  const completed = data.filter((p) => p.status === 'completed')
  const failed = data.filter((p) => p.status === 'failed')
  const snapshotted = completed.filter((p) => p.financial_snapshot_at)

  return {
    grossRevenue: snapshotted.reduce(
      (sum, p) => sum + Number(p.gross_amount ?? p.amount),
      0
    ),
    gatewayExpenses: snapshotted.reduce(
      (sum, p) => sum + Number(p.gateway_total_fee ?? 0),
      0
    ),
    netRevenue: snapshotted.reduce(
      (sum, p) => sum + Number(p.net_received_amount ?? 0),
      0
    ),
    platformRevenue: snapshotted.reduce(
      (sum, p) => sum + Number(p.platform_revenue ?? 0),
      0
    ),
    instructorRevenue: snapshotted.reduce(
      (sum, p) => sum + Number(p.instructor_revenue ?? 0),
      0
    ),
    totalTransactions: data.length,
    successfulPayments: completed.length,
    failedPayments: failed.length,
    legacyPayments: completed.filter((p) => !p.financial_snapshot_at).length,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPaymentFilters(query: any, params: AdminPaymentsParams) {
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  if (params.method && params.method !== 'all') {
    query = query.eq('method', params.method)
  }
  if (params.dateFrom) {
    query = query.gte('created_at', `${params.dateFrom}T00:00:00.000Z`)
  }
  if (params.dateTo) {
    query = query.lte('created_at', `${params.dateTo}T23:59:59.999Z`)
  }
  return query
}

export async function getAdminPayments(
  params: AdminPaymentsParams = {}
): Promise<AdminPaymentRow[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from('payments')
    .select(`
      id,
      reference_id,
      amount,
      method,
      status,
      created_at,
      gross_amount,
      gateway_total_fee,
      net_received_amount,
      platform_revenue,
      instructor_revenue,
      platform_percentage,
      instructor_percentage,
      gateway_type,
      agreement_id,
      payout_status,
      financial_snapshot_at,
      user:users(full_name, full_name_ar),
      course:courses(title, title_ar, instructor:users(full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  query = applyPaymentFilters(query, params)

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  return (data as RawPayment[]).map((row) => {
    const user = unwrapRelation(row.user)
    const course = unwrapRelation(row.course)
    const instructor = course ? unwrapRelation(course.instructor) : null
    const isLegacy = !row.financial_snapshot_at

    return {
      id: row.id,
      referenceId: row.reference_id ?? '—',
      studentName: user?.full_name ?? '—',
      studentNameAr: user?.full_name_ar,
      courseTitle: course?.title ?? '—',
      courseTitleAr: course?.title_ar ?? '—',
      instructorName: instructor?.full_name ?? '—',
      grossAmount: Number(row.gross_amount ?? row.amount),
      gatewayFee: Number(row.gateway_total_fee ?? 0),
      netReceived: row.net_received_amount != null ? Number(row.net_received_amount) : null,
      platformRevenue: row.platform_revenue != null ? Number(row.platform_revenue) : null,
      instructorRevenue:
        row.instructor_revenue != null ? Number(row.instructor_revenue) : null,
      platformPercentage:
        row.platform_percentage != null ? Number(row.platform_percentage) : null,
      instructorPercentage:
        row.instructor_percentage != null ? Number(row.instructor_percentage) : null,
      method: row.method,
      gatewayType: row.gateway_type,
      status: row.status,
      payoutStatus: row.payout_status ?? 'pending',
      agreementId: row.agreement_id,
      createdAt: row.created_at,
      isLegacy,
    }
  })
}

export function parseAdminPaymentsParams(
  searchParams: Record<string, string | string[] | undefined>
): AdminPaymentsParams {
  const statusRaw = searchParams.status
  const methodRaw = searchParams.method
  const dateFromRaw = searchParams.from
  const dateToRaw = searchParams.to

  const validStatuses: AdminPaymentStatusFilter[] = [
    'all',
    'pending',
    'completed',
    'failed',
    'refunded',
  ]
  const validMethods: AdminPaymentMethodFilter[] = [
    'all',
    'zaincash',
    'qicard',
    'virtual',
  ]

  const status =
    typeof statusRaw === 'string' && validStatuses.includes(statusRaw as AdminPaymentStatusFilter)
      ? (statusRaw as AdminPaymentStatusFilter)
      : 'all'

  const method =
    typeof methodRaw === 'string' && validMethods.includes(methodRaw as AdminPaymentMethodFilter)
      ? (methodRaw as AdminPaymentMethodFilter)
      : 'all'

  return {
    status,
    method,
    dateFrom: typeof dateFromRaw === 'string' ? dateFromRaw : undefined,
    dateTo: typeof dateToRaw === 'string' ? dateToRaw : undefined,
  }
}
