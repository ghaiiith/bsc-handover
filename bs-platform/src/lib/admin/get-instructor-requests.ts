import { createAdminClient } from '@/lib/supabase/admin'
import type { InstructorRequest, User } from '@/types'

export type InstructorRequestFilter = 'all' | 'pending' | 'approved' | 'rejected'

export interface InstructorRequestRow extends InstructorRequest {
  user: User
}

export interface InstructorRequestStats {
  pending: number
  approved: number
  rejected: number
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

export async function getInstructorRequests(
  filter: InstructorRequestFilter = 'pending'
): Promise<{ requests: InstructorRequestRow[]; stats: InstructorRequestStats }> {
  const admin = createAdminClient()

  let query = admin
    .from('instructor_requests')
    .select('*, user:users(*)')
    .order('created_at', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data } = await query

  const requests: InstructorRequestRow[] = (data ?? [])
    .map((row) => {
      const user = unwrap((row as { user: User | User[] | null }).user)
      if (!user) return null
      return { ...(row as InstructorRequest), user }
    })
    .filter((r): r is InstructorRequestRow => r !== null)

  const { data: all } = await admin.from('instructor_requests').select('status')

  const stats: InstructorRequestStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
  }
  ;(all ?? []).forEach((r) => {
    const st = r.status as keyof InstructorRequestStats
    if (st in stats) stats[st] += 1
  })

  return { requests, stats }
}

export function parseInstructorRequestFilter(
  searchParams: Record<string, string | string[] | undefined>
): InstructorRequestFilter {
  const raw = searchParams.status
  const valid: InstructorRequestFilter[] = ['all', 'pending', 'approved', 'rejected']
  return typeof raw === 'string' && valid.includes(raw as InstructorRequestFilter)
    ? (raw as InstructorRequestFilter)
    : 'pending'
}
