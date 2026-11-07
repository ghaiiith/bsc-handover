import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import {
  getPlatformSettings,
  parseHomepageBanners,
  type HomepageBanner,
} from '@/lib/admin/platform-settings'
import { listPublishedCourses } from '@/lib/courses/list-courses'
import { listActiveJobs } from '@/lib/jobs/list-jobs'
import { listActiveServices } from '@/lib/services/list-services'
import type { CourseListItem } from '@/lib/courses/list-courses'
import type { ServiceListItem } from '@/lib/services/list-services'
import type { Job, User } from '@/types'

export interface LandingCompany {
  name: string
  openPositions: number
  hiring: boolean
}

export interface LandingInstructor {
  id: string
  full_name: string
  full_name_ar: string | null
  avatar_url: string | null
  courseCount: number
  expertise: string
}

export interface LandingStats {
  students: number
  courses: number
  jobs: number
  instructors: number
  companies: number
}

export interface CuratedCompany {
  name: string
  name_ar?: string
  logo_url?: string
  link?: string
}

export interface LandingData {
  stats: LandingStats
  courses: CourseListItem[]
  jobs: Job[]
  services: ServiceListItem[]
  instructors: LandingInstructor[]
  companies: LandingCompany[]
  /** Report BS-73: admin-managed homepage banner slides (enabled only). */
  banners: HomepageBanner[]
  /** Report BS-74: admin-picked companies for the homepage slider. */
  curatedCompanies: CuratedCompany[]
}

async function loadLandingData(): Promise<LandingData> {
  // Cookie-less anon client: keeps this function free of request state so it
  // can be cached with `unstable_cache`. Only public (RLS) data is read.
  const supabase = createPublicClient()

  const [
    coursesResult,
    jobsResult,
    servicesResult,
    studentsCount,
    instructorsCount,
    coursesCount,
    jobsCount,
    instructorsData,
    jobsForCompanies,
  ] = await Promise.all([
    listPublishedCourses({ page: 1, sort: 'most_enrolled', limit: 12 }, supabase),
    listActiveJobs({ page: 1, sort: 'newest' }, supabase),
    listActiveServices({ page: 1, sort: 'best_rated', limit: 12 }, supabase),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'instructor'),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('users')
      .select('id, full_name, full_name_ar, avatar_url')
      .eq('role', 'instructor')
      .limit(6),
    supabase.from('jobs').select('company_name').eq('status', 'active'),
  ])

  const instructorRows = (instructorsData.data ?? []) as Pick<
    User,
    'id' | 'full_name' | 'full_name_ar' | 'avatar_url'
  >[]

  // Single query for all instructors' published-course counts (was an N+1
  // wave of one COUNT query per instructor).
  const instructorIds = instructorRows.map((i) => i.id)
  const courseCountByInstructor = new Map<string, number>()
  if (instructorIds.length > 0) {
    const { data: instructorCourseRows } = await supabase
      .from('courses')
      .select('instructor_id')
      .in('instructor_id', instructorIds)
      .eq('status', 'published')
    for (const row of instructorCourseRows ?? []) {
      const id = (row as { instructor_id: string }).instructor_id
      courseCountByInstructor.set(id, (courseCountByInstructor.get(id) ?? 0) + 1)
    }
  }

  const instructors: LandingInstructor[] = instructorRows.map((instructor) => ({
    id: instructor.id,
    full_name: instructor.full_name,
    full_name_ar: instructor.full_name_ar ?? null,
    avatar_url: instructor.avatar_url ?? null,
    courseCount: courseCountByInstructor.get(instructor.id) ?? 0,
    expertise: 'Professional Instructor',
  }))

  const companyMap = new Map<string, number>()
  for (const row of jobsForCompanies.data ?? []) {
    const name = (row as { company_name: string }).company_name?.trim()
    if (!name) continue
    companyMap.set(name, (companyMap.get(name) ?? 0) + 1)
  }

  const companies: LandingCompany[] = [...companyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, openPositions]) => ({
      name,
      openPositions,
      hiring: true,
    }))

  // Report BS-73/74: admin-managed banner slides + picked companies from
  // platform_settings (admin-client + cached — safe inside this cached loader).
  const settings = await getPlatformSettings()
  const banners = parseHomepageBanners(settings.homepage_banners).filter((b) => b.enabled)
  let curatedCompanies: CuratedCompany[] = []
  try {
    const raw = JSON.parse(settings.homepage_companies || '[]')
    if (Array.isArray(raw)) {
      curatedCompanies = raw
        .filter((c) => c && typeof c.name === 'string' && c.name)
        .map((c) => ({
          name: c.name,
          name_ar: c.name_ar ?? '',
          logo_url: c.logo_url ?? '',
          link: c.link ?? '',
        }))
    }
  } catch {
    /* keep empty */
  }

  return {
    stats: {
      students: studentsCount.count ?? 0,
      courses: coursesCount.count ?? 0,
      jobs: jobsCount.count ?? 0,
      instructors: instructorsCount.count ?? 0,
      companies: companyMap.size,
    },
    courses: coursesResult.courses.slice(0, 3),
    jobs: jobsResult.jobs.slice(0, 3),
    services: servicesResult.services.slice(0, 3),
    instructors: instructors.slice(0, 8),
    companies,
    banners,
    curatedCompanies,
  }
}

/**
 * Cached landing payload. The underlying queries are bounded and read only
 * public data, so we cache the result for 120s and share it across all
 * requests instead of re-querying the DB on every page view.
 */
export const getLandingData = unstable_cache(loadLandingData, ['landing-data'], {
  revalidate: 120,
})
