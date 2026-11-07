import { createAdminClient } from '@/lib/supabase/admin'

export interface AdminNavCounts {
  pendingCourses: number
  pendingServices: number
  pendingInstructorRequests: number
  pendingCompanyRequests: number
  pendingFreelancerRequests: number
  pendingRoleRequests: number
}

function readCount(res: { count: number | null; error: { message: string } | null }): number {
  if (res.error) {
    console.warn('[admin/nav-counts]', res.error.message)
    return 0
  }
  return res.count ?? 0
}

export async function getAdminNavCounts(): Promise<AdminNavCounts> {
  const admin = createAdminClient()

  const [coursesRes, servicesRes, instructorRes, companyRes, freelancerRes] = await Promise.all([
    admin
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('instructor_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('company_affiliation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('freelancer_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const pendingInstructorRequests = readCount(instructorRes)
  const pendingCompanyRequests = readCount(companyRes)
  const pendingFreelancerRequests = readCount(freelancerRes)

  return {
    pendingCourses: readCount(coursesRes),
    pendingServices: readCount(servicesRes),
    pendingInstructorRequests,
    pendingCompanyRequests,
    pendingFreelancerRequests,
    pendingRoleRequests:
      pendingInstructorRequests + pendingCompanyRequests + pendingFreelancerRequests,
  }
}
