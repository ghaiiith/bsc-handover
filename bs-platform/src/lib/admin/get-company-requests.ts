import { createAdminClient } from '@/lib/supabase/admin'
import type { CompanyAffiliationRequest, User } from '@/types'

export type CompanyRequestFilter = 'all' | 'pending' | 'approved' | 'rejected'

export interface CompanyAffiliationRequestRow extends CompanyAffiliationRequest {
  user: User
}

export interface CompanyRequestStats {
  pending: number
  approved: number
  rejected: number
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export async function getCompanyAffiliationRequests(
  filter: CompanyRequestFilter = 'pending'
): Promise<{ requests: CompanyAffiliationRequestRow[]; stats: CompanyRequestStats }> {
  const admin = createAdminClient()

  let query = admin
    .from('company_affiliation_requests')
    .select('*, user:users(*)')
    .order('created_at', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data } = await query

  const requests: CompanyAffiliationRequestRow[] = (data ?? [])
    .map((row) => {
      const user = unwrap((row as { user: User | User[] | null }).user)
      if (!user) return null
      return { ...(row as CompanyAffiliationRequest), user }
    })
    .filter((r): r is CompanyAffiliationRequestRow => r !== null)

  const { data: all } = await admin.from('company_affiliation_requests').select('status')

  const stats: CompanyRequestStats = { pending: 0, approved: 0, rejected: 0 }
  ;(all ?? []).forEach((r) => {
    const st = r.status as keyof CompanyRequestStats
    if (st in stats) stats[st] += 1
  })

  return { requests, stats }
}

export function parseCompanyRequestFilter(
  searchParams: Record<string, string | string[] | undefined>
): CompanyRequestFilter {
  const raw = searchParams.status
  const valid: CompanyRequestFilter[] = ['all', 'pending', 'approved', 'rejected']
  return typeof raw === 'string' && valid.includes(raw as CompanyRequestFilter)
    ? (raw as CompanyRequestFilter)
    : 'pending'
}
