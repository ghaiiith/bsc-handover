import { createClient } from '@/lib/supabase/server'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'
import type { Job } from '@/types'

export type AdminJobStatusFilter = Job['status'] | 'all'

export type AdminJobRow = Job

export interface AdminJobsStats {
  activeJobs: number
  totalJobs: number
  closedJobs: number
}

export interface AdminJobsParams {
  status?: AdminJobStatusFilter
  q?: string
}

export async function getAdminJobsStats(): Promise<AdminJobsStats> {
  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const [activeRes, totalRes, closedRes] = await Promise.all([
    // Report BS-85: "active" must exclude the jobs the closed counter claims —
    // otherwise the two figures contradict each other on the same screen.
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
      .or(`deadline.is.null,deadline.gte.${nowIso}`),
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    // Report BS-85: a job "closes" either by an explicit status (closed/expired)
    // OR by passing its deadline/expiry while the expire cron hasn't marked it
    // yet. Counting only status='closed' always read 0 because expired jobs use
    // the 'expired' status and past-deadline jobs may still be 'active'.
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .or(
        `status.in.(closed,expired),and(status.eq.active,expires_at.lt.${nowIso}),and(status.eq.active,deadline.lt.${nowIso})`
      ),
  ])

  return {
    activeJobs: activeRes.count ?? 0,
    totalJobs: totalRes.count ?? 0,
    closedJobs: closedRes.count ?? 0,
  }
}

export async function getAdminJobs(
  params: AdminJobsParams = {}
): Promise<AdminJobRow[]> {
  const supabase = await createClient()

  let query = supabase.from('jobs').select('*').order('created_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  const term = sanitizeSearchTerm(params.q)
  if (term) {
    query = query.or(
      `title.ilike.%${term}%,title_ar.ilike.%${term}%,company_name.ilike.%${term}%`
    )
  }

  const { data, error } = await query

  if (error || !data) return []

  return data as AdminJobRow[]
}

export function parseAdminJobsParams(
  searchParams: Record<string, string | string[] | undefined>
): AdminJobsParams {
  const statusRaw = searchParams.status
  const valid: AdminJobStatusFilter[] = ['all', 'active', 'closed', 'draft']

  return {
    status:
      typeof statusRaw === 'string' && valid.includes(statusRaw as AdminJobStatusFilter)
        ? (statusRaw as AdminJobStatusFilter)
        : 'all',
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
  }
}

export async function getJobForEdit(jobId: string): Promise<Job | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) return null
  return data as Job
}
