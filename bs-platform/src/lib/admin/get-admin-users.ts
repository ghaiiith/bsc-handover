import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'
import type { User, UserRole } from '@/types'

export type AdminUserRoleFilter = UserRole | 'all'
export type AdminUserStatusFilter = 'all' | 'active' | 'banned'
export type AdminUserSort = 'newest' | 'oldest' | 'name_asc'

export interface AdminUsersParams {
  q?: string
  role?: AdminUserRoleFilter
  status?: AdminUserStatusFilter
  sort?: AdminUserSort
  page?: number
}

export interface AdminUsersStats {
  total: number
  students: number
  instructors: number
  newThisWeek: number
}

export interface AdminUsersResult {
  users: User[]
  total: number
  page: number
  totalPages: number
  stats: AdminUsersStats
}

const PAGE_SIZE = 20

export async function getAdminUsers(
  params: AdminUsersParams = {}
): Promise<AdminUsersResult> {
  const admin = createAdminClient()
  const page = Math.max(1, params.page ?? 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = admin.from('users').select('*', { count: 'exact' })

  const sanitized = sanitizeSearchTerm(params.q)
  if (sanitized) {
    const term = `%${sanitized}%`
    query = query.or(
      `full_name.ilike.${term},full_name_ar.ilike.${term},email.ilike.${term}`
    )
  }

  if (params.role && params.role !== 'all') {
    query = query.eq('role', params.role)
  }

  if (params.status === 'active') {
    query = query.eq('is_active', true)
  } else if (params.status === 'banned') {
    query = query.eq('is_active', false)
  }

  const sort = params.sort ?? 'newest'
  if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true })
  } else if (sort === 'name_asc') {
    query = query.order('full_name', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, count, error } = await query.range(from, to)

  const stats = await getAdminUsersStats()

  return {
    users: (error ? [] : (data ?? [])) as User[],
    total: count ?? 0,
    page,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    stats,
  }
}

async function getAdminUsersStats(): Promise<AdminUsersStats> {
  const admin = createAdminClient()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [totalRes, studentsRes, instructorsRes, newRes] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student'),
    admin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'instructor'),
    admin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString()),
  ])

  return {
    total: totalRes.count ?? 0,
    students: studentsRes.count ?? 0,
    instructors: instructorsRes.count ?? 0,
    newThisWeek: newRes.count ?? 0,
  }
}

export async function getAdminUserDetail(userId: string) {
  const admin = createAdminClient()

  const { data: user } = await admin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!user) return null

  const [courses, enrollments, recentEnrollments] = await Promise.all([
    admin
      .from('courses')
      .select('id, title, title_ar, status, price')
      .eq('instructor_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('enrollments')
      .select('id, enrolled_at, course:courses(title, title_ar)')
      .eq('student_id', userId)
      .order('enrolled_at', { ascending: false })
      .limit(5),
    admin
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', userId),
  ])

  return {
    user: user as User,
    courses: courses.data ?? [],
    enrollments: enrollments.data ?? [],
    enrollmentCount: recentEnrollments.count ?? 0,
  }
}

export async function getAllUsersForExport(): Promise<User[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  return (data ?? []) as User[]
}

export function parseAdminUsersParams(
  searchParams: Record<string, string | string[] | undefined>
): AdminUsersParams {
  const get = (key: string) => {
    const v = searchParams[key]
    return typeof v === 'string' ? v : undefined
  }

  const role = get('role') as AdminUserRoleFilter | undefined
  const status = get('status') as AdminUserStatusFilter | undefined
  const sort = get('sort') as AdminUserSort | undefined
  const pageRaw = get('page')
  const page = pageRaw ? parseInt(pageRaw, 10) : 1

  const validRoles: AdminUserRoleFilter[] = ['all', 'student', 'instructor', 'admin']
  const validStatus: AdminUserStatusFilter[] = ['all', 'active', 'banned']
  const validSort: AdminUserSort[] = ['newest', 'oldest', 'name_asc']

  return {
    q: get('q'),
    role: role && validRoles.includes(role) ? role : 'all',
    status: status && validStatus.includes(status) ? status : 'all',
    sort: sort && validSort.includes(sort) ? sort : 'newest',
    page: Number.isFinite(page) ? page : 1,
  }
}
