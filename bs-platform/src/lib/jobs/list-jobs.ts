import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'
import type { Job, JobType } from '@/types'
import { JOBS_PAGE_SIZE, type JobSort } from '@/lib/jobs/job-utils'

/**
 * Where a job came from. Channel-imported listings vastly outnumber the ones
 * posted on the platform (thousands vs a handful), so the two are separable and
 * platform posts always sort ahead of imports.
 */
export type JobSource = 'all' | 'platform' | 'external'

export interface JobListParams {
  page?: number
  q?: string
  city?: string
  jobType?: JobType | 'all'
  skill?: string
  sort?: JobSort
  source?: JobSource
}

export interface JobListResult {
  jobs: Job[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  error?: string
}

export function parseJobListParams(
  searchParams: Record<string, string | string[] | undefined>
): JobListParams {
  const pageRaw = searchParams.page
  const page =
    typeof pageRaw === 'string' ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1

  const sortRaw = searchParams.sort
  const validSorts: JobSort[] = ['newest', 'deadline', 'salary_desc']
  const sort =
    typeof sortRaw === 'string' && validSorts.includes(sortRaw as JobSort)
      ? (sortRaw as JobSort)
      : 'newest'

  const sourceRaw = searchParams.source
  const validSources: JobSource[] = ['all', 'platform', 'external']
  const source =
    typeof sourceRaw === 'string' && validSources.includes(sourceRaw as JobSource)
      ? (sourceRaw as JobSource)
      : 'all'

  const typeRaw = searchParams.type
  const validTypes: (JobType | 'all')[] = [
    'all',
    'full_time',
    'part_time',
    'remote',
    'internship',
  ]
  const jobType =
    typeof typeRaw === 'string' && validTypes.includes(typeRaw as JobType | 'all')
      ? (typeRaw as JobType | 'all')
      : 'all'

  return {
    page,
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
    city: typeof searchParams.city === 'string' ? searchParams.city : undefined,
    jobType,
    skill: typeof searchParams.skill === 'string' ? searchParams.skill : undefined,
    sort,
    source,
  }
}

export function hasActiveJobFilters(params: JobListParams): boolean {
  return Boolean(
    params.q?.trim() ||
      params.city ||
      (params.jobType && params.jobType !== 'all') ||
      (params.source && params.source !== 'all') ||
      params.skill?.trim()
  )
}

const JOB_LIST_SELECT = `
  id,
  admin_id,
  title,
  title_ar,
  company_name,
  city,
  job_type,
  salary_min,
  salary_max,
  currency,
  skills,
  description,
  description_ar,
  deadline,
  status,
  is_external,
  is_featured,
  created_at,
  updated_at
`

export async function listActiveJobs(
  params: JobListParams = {},
  client?: SupabaseClient
): Promise<JobListResult> {
  const supabase = client ?? (await createClient())
  const page = params.page ?? 1
  const from = (page - 1) * JOBS_PAGE_SIZE
  const to = from + JOBS_PAGE_SIZE - 1

  let query = supabase
    .from('jobs')
    // Exact, not estimated: the planner estimate under-reported the live
    // listing by 60% (1001 shown vs 2532 real). An exact count over this table
    // measures ~15ms, which is not worth a wrong number on the page.
    .select(JOB_LIST_SELECT, { count: 'exact' })
    .eq('status', 'active')
    // Hide jobs past their 30-day lifetime even before the expiry cron sweeps
    // them (report BS-16).
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  const term = sanitizeSearchTerm(params.q)
  if (term) {
    query = query.or(
      `title.ilike.%${term}%,title_ar.ilike.%${term}%,company_name.ilike.%${term}%,description.ilike.%${term}%,description_ar.ilike.%${term}%`
    )
  }

  if (params.city) {
    query = query.eq('city', params.city)
  }

  if (params.jobType && params.jobType !== 'all') {
    query = query.eq('job_type', params.jobType)
  }

  if (params.source === 'platform') {
    query = query.eq('is_external', false)
  } else if (params.source === 'external') {
    query = query.eq('is_external', true)
  }

  if (params.skill?.trim()) {
    query = query.contains('skills', [params.skill.trim()])
  }

  // Round 9 (BS-111): featured (Enterprise) jobs lead everything, then jobs
  // posted on the platform, then the imports — otherwise the thousands of
  // imported listings bury them. Within each group the requested sort applies.
  query = query.order('is_featured', { ascending: false })
  if (params.source !== 'platform' && params.source !== 'external') {
    query = query.order('is_external', { ascending: true, nullsFirst: true })
  }

  switch (params.sort) {
    case 'deadline':
      query = query.order('deadline', { ascending: true, nullsFirst: false })
      break
    case 'salary_desc':
      query = query.order('salary_max', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    return {
      jobs: [],
      total: 0,
      page,
      pageSize: JOBS_PAGE_SIZE,
      totalPages: 0,
      error: error.message,
    }
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / JOBS_PAGE_SIZE))

  return {
    jobs: (data ?? []) as Job[],
    total,
    page,
    pageSize: JOBS_PAGE_SIZE,
    totalPages,
  }
}

/**
 * Cached public listing for the /jobs page. Cookieless anon client so the result
 * is memoizable with `unstable_cache`; only RLS-public data is read.
 */
export function getCachedActiveJobs(
  params: JobListParams = {}
): Promise<JobListResult> {
  return unstable_cache(
    () => listActiveJobs(params, createPublicClient()),
    ['active-jobs', JSON.stringify(params)],
    { revalidate: 120, tags: ['jobs'] }
  )()
}
