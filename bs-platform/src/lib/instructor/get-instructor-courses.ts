import { createClient } from '@/lib/supabase/server'
import {
  computeCourseRatingStats,
  fetchCourseRatings,
  type CourseRatingRow,
} from '@/lib/courses/course-list-stats'
import { getEnrollmentCountsByCourseIds } from '@/lib/courses/enrollment-count'
import type { Course, CourseStatus } from '@/types'

export type InstructorCourseStatusFilter = CourseStatus | 'all'

export interface InstructorCourseRow extends Course {
  enrollment_count: number
  avg_rating: number
  review_count: number
}

export interface InstructorCoursesParams {
  status?: InstructorCourseStatusFilter
}

type RawCourseRow = Course

function enrichCourse(
  row: RawCourseRow,
  ratings: CourseRatingRow[],
  enrollmentCount: number
): InstructorCourseRow {
  const { avg_rating, review_count } = computeCourseRatingStats(row.id, ratings)

  return {
    ...row,
    enrollment_count: enrollmentCount,
    avg_rating,
    review_count,
  }
}

export async function getInstructorCourses(
  instructorId: string,
  params: InstructorCoursesParams = {}
): Promise<InstructorCourseRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('updated_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  const rows = data as RawCourseRow[]
  const ratings = await fetchCourseRatings(
    supabase,
    rows.map((row) => row.id)
  )
  const enrollmentCounts = await getEnrollmentCountsByCourseIds(rows.map((row) => row.id))
  return rows.map((row) =>
    enrichCourse(row, ratings, enrollmentCounts.get(row.id) ?? 0)
  )
}

export function parseInstructorCoursesParams(
  searchParams: Record<string, string | string[] | undefined>
): InstructorCoursesParams {
  const statusRaw = searchParams.status
  const status = typeof statusRaw === 'string' ? statusRaw : undefined
  const valid: InstructorCourseStatusFilter[] = [
    'all',
    'draft',
    'pending',
    'published',
    'rejected',
  ]

  return {
    status:
      status && valid.includes(status as InstructorCourseStatusFilter)
        ? (status as InstructorCourseStatusFilter)
        : 'all',
  }
}
