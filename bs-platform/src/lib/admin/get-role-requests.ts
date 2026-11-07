import { createAdminClient } from '@/lib/supabase/admin'
import {
  getCompanyAffiliationRequests,
  type CompanyAffiliationRequestRow,
} from '@/lib/admin/get-company-requests'
import {
  getFreelancerRequests,
  type FreelancerRequestRow,
} from '@/lib/admin/get-freelancer-requests'
import {
  getInstructorRequests,
  type InstructorRequestRow,
} from '@/lib/admin/get-instructor-requests'

export type RoleRequestKind = 'instructor' | 'company' | 'freelancer'

export type RoleRequestFilter = 'all' | RoleRequestKind

export interface RoleRequestStats {
  instructor: { pending: number; approved: number; rejected: number }
  company: { pending: number; approved: number; rejected: number }
  freelancer: { pending: number; approved: number; rejected: number }
  totalPending: number
}

export type RoleRequestListItem =
  | { kind: 'instructor'; request: InstructorRequestRow }
  | { kind: 'company'; request: CompanyAffiliationRequestRow }
  | { kind: 'freelancer'; request: FreelancerRequestRow }

export function parseRoleRequestFilter(
  searchParams: Record<string, string | string[] | undefined>
): RoleRequestFilter {
  const raw = searchParams.role
  const valid: RoleRequestFilter[] = ['all', 'instructor', 'company', 'freelancer']
  return typeof raw === 'string' && valid.includes(raw as RoleRequestFilter)
    ? (raw as RoleRequestFilter)
    : 'all'
}

export function parseRoleRequestStatus(
  searchParams: Record<string, string | string[] | undefined>
): 'pending' | 'all' | 'approved' | 'rejected' {
  const raw = searchParams.status
  const valid = ['pending', 'all', 'approved', 'rejected'] as const
  return typeof raw === 'string' && valid.includes(raw as (typeof valid)[number])
    ? (raw as (typeof valid)[number])
    : 'pending'
}

export async function getRoleRequestStats(): Promise<RoleRequestStats> {
  const admin = createAdminClient()

  const [instructorRes, companyRes, freelancerRes] = await Promise.all([
    admin.from('instructor_requests').select('status'),
    admin.from('company_affiliation_requests').select('status'),
    admin.from('freelancer_requests').select('status'),
  ])

  const countByStatus = (rows: { status: string }[] | null) => {
    const stats = { pending: 0, approved: 0, rejected: 0 }
    for (const row of rows ?? []) {
      const key = row.status as keyof typeof stats
      if (key in stats) stats[key] += 1
    }
    return stats
  }

  const instructor = countByStatus(instructorRes.data)
  const company = countByStatus(companyRes.data)
  const freelancer = countByStatus(freelancerRes.error ? [] : freelancerRes.data)

  return {
    instructor,
    company,
    freelancer,
    totalPending: instructor.pending + company.pending + freelancer.pending,
  }
}

export async function getRoleRequestsForAdmin(
  roleFilter: RoleRequestFilter,
  statusFilter: 'pending' | 'all' | 'approved' | 'rejected' = 'pending'
): Promise<{ items: RoleRequestListItem[]; stats: RoleRequestStats }> {
  const listFilter = statusFilter === 'all' ? 'all' : statusFilter

  const [stats, instructorData, companyData, freelancerData] = await Promise.all([
    getRoleRequestStats(),
    roleFilter === 'all' || roleFilter === 'instructor'
      ? getInstructorRequests(listFilter)
      : Promise.resolve({ requests: [], stats: { pending: 0, approved: 0, rejected: 0 } }),
    roleFilter === 'all' || roleFilter === 'company'
      ? getCompanyAffiliationRequests(listFilter)
      : Promise.resolve({ requests: [], stats: { pending: 0, approved: 0, rejected: 0 } }),
    roleFilter === 'all' || roleFilter === 'freelancer'
      ? getFreelancerRequests(listFilter)
      : Promise.resolve({ requests: [], stats: { pending: 0, approved: 0, rejected: 0 } }),
  ])

  const items: RoleRequestListItem[] = [
    ...instructorData.requests.map((request) => ({ kind: 'instructor' as const, request })),
    ...companyData.requests.map((request) => ({ kind: 'company' as const, request })),
    ...freelancerData.requests.map((request) => ({ kind: 'freelancer' as const, request })),
  ].sort(
    (a, b) =>
      new Date(b.request.created_at).getTime() - new Date(a.request.created_at).getTime()
  )

  return { items, stats }
}
