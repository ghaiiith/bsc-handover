import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@/types'

export type FreelancerRequestFilter = 'all' | 'pending' | 'approved' | 'rejected'

export interface FreelancerRequestRow {
  id: string
  user_id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  user: User
}

export interface FreelancerRequestStats {
  pending: number
  approved: number
  rejected: number
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export async function getFreelancerRequests(
  filter: FreelancerRequestFilter = 'pending'
): Promise<{ requests: FreelancerRequestRow[]; stats: FreelancerRequestStats }> {
  const admin = createAdminClient()

  let query = admin
    .from('freelancer_requests')
    .select('*, user:users(*)')
    .order('created_at', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data } = await query

  const requests: FreelancerRequestRow[] = (data ?? [])
    .map((row) => {
      const user = unwrap((row as { user: User | User[] | null }).user)
      if (!user) return null
      return { ...(row as Omit<FreelancerRequestRow, 'user'>), user }
    })
    .filter((r): r is FreelancerRequestRow => r !== null)

  const { data: all } = await admin.from('freelancer_requests').select('status')

  const stats: FreelancerRequestStats = { pending: 0, approved: 0, rejected: 0 }
  ;(all ?? []).forEach((r) => {
    const st = r.status as keyof FreelancerRequestStats
    if (st in stats) stats[st] += 1
  })

  return { requests, stats }
}

export function parseFreelancerRequestFilter(
  searchParams: Record<string, string | string[] | undefined>
): FreelancerRequestFilter {
  const raw = searchParams.status
  const valid: FreelancerRequestFilter[] = ['all', 'pending', 'approved', 'rejected']
  return typeof raw === 'string' && valid.includes(raw as FreelancerRequestFilter)
    ? (raw as FreelancerRequestFilter)
    : 'pending'
}
