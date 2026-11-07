import { createAdminClient } from '@/lib/supabase/admin'
import { getCourseVideoSummaries } from '@/lib/admin/get-course-video-summary'
import type { Course, CourseStatus, User } from '@/types'

export type AdminCourseStatusFilter = CourseStatus | 'all'

export interface AdminCourseRow extends Omit<Course, 'instructor'> {
  instructor: Pick<User, 'id' | 'full_name' | 'full_name_ar'>
  enrollment_count: number
  video_summary?: {
    primaryProvider: string | null
    videoStatus: string
    health: string
    processing: string
    durationSeconds: number
    resolution: string | null
    storageBytes: number
    estimatedMonthlyCostUsd: number
  }
}

export interface AdminCoursesParams {
  status?: AdminCourseStatusFilter
  category?: string
  q?: string
}

export interface AdminCourseStats {
  published: number
  pending: number
  draft: number
  rejected: number
}

type RawAdminCourseRow = Course & {
  instructor: Pick<User, 'id' | 'full_name' | 'full_name_ar'> | null
  enrollments: { count: number }[]
}

function enrichCourse(row: RawAdminCourseRow): AdminCourseRow | null {
  if (!row.instructor) return null
  const { enrollments, instructor, ...course } = row
  return {
    ...course,
    instructor,
    enrollment_count: enrollments?.[0]?.count ?? 0,
  }
}

export async function getAdminCourseStats(): Promise<AdminCourseStats> {
  const admin = createAdminClient()
  const statuses: CourseStatus[] = ['published', 'pending', 'draft', 'rejected']
  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await admin
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      return { status, count: count ?? 0 }
    })
  )
  const map = Object.fromEntries(counts.map((c) => [c.status, c.count]))
  return {
    published: map.published ?? 0,
    pending: map.pending ?? 0,
    draft: map.draft ?? 0,
    rejected: map.rejected ?? 0,
  }
}

export async function getAdminCourses(
  params: AdminCoursesParams = {}
): Promise<AdminCourseRow[]> {
  const admin = createAdminClient()

  let query = admin
    .from('courses')
    .select(`
      *,
      instructor:users(id, full_name, full_name_ar),
      enrollments(count)
    `)
    .order('updated_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  if (params.category) {
    query = query.eq('category', params.category)
  }

  const { data, error } = await query

  if (error || !data) return []

  let rows = (data as RawAdminCourseRow[])
    .map(enrichCourse)
    .filter((row): row is AdminCourseRow => row !== null)

  if (params.q?.trim()) {
    const term = params.q.trim().toLowerCase()
    rows = rows.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.title_ar.includes(term) ||
        c.instructor.full_name.toLowerCase().includes(term) ||
        (c.instructor.full_name_ar?.toLowerCase().includes(term) ?? false)
    )
  }

  const summaries = await getCourseVideoSummaries(rows.map((r) => r.id))
  rows = rows.map((row) => {
    const summary = summaries.get(row.id)
    if (!summary) return row
    return {
      ...row,
      video_summary: {
        primaryProvider: summary.primaryProvider,
        videoStatus: summary.videoStatus,
        health: summary.health,
        processing: summary.processing,
        durationSeconds: summary.durationSeconds,
        resolution: summary.resolution,
        storageBytes: summary.storageBytes,
        estimatedMonthlyCostUsd: summary.estimatedMonthlyCostUsd,
      },
    }
  })

  return rows
}

export function parseAdminCoursesParams(
  searchParams: Record<string, string | string[] | undefined>
): AdminCoursesParams {
  const statusRaw = searchParams.status
  const status = typeof statusRaw === 'string' ? statusRaw : undefined
  const valid: AdminCourseStatusFilter[] = [
    'all',
    'draft',
    'pending',
    'published',
    'rejected',
  ]

  return {
    status:
      status && valid.includes(status as AdminCourseStatusFilter)
        ? (status as AdminCourseStatusFilter)
        : 'all',
    category: typeof searchParams.category === 'string' ? searchParams.category : undefined,
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
  }
}
