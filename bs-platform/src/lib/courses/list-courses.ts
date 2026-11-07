import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import {
  computeCourseRatingStats,
  fetchCourseRatings,
  type CourseRatingRow,
} from '@/lib/courses/course-list-stats'
import { getEnrollmentCountsByCourseIds } from '@/lib/courses/enrollment-count'
import { calculatePricesForCourses } from '@/lib/discounts'
import { normalizeMoneyAmount } from '@/lib/format-number'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'
import type { Course, CourseLevel, User } from '@/types'

export const COURSES_PAGE_SIZE = 12

export type CourseSort = 'newest' | 'price_asc' | 'price_desc' | 'most_enrolled'
export type CoursePriceFilter = 'all' | 'free' | 'paid'

export interface CourseListParams {
  page?: number
  q?: string
  category?: string
  level?: CourseLevel
  price?: CoursePriceFilter
  language?: string
  sort?: CourseSort
  /**
   * Bound the number of rows scanned for in-memory-sorted branches
   * (e.g. `most_enrolled`). Used by preview contexts like the landing page
   * so they don't load the entire published-courses table.
   */
  limit?: number
}

export interface CourseListItem extends Course {
  enrollment_count: number
  avg_rating: number
  review_count: number
  instructor?: User
  /** Computed sale price when discounts or active offers apply. */
  sale_price?: number
  discount_percent_off?: number
}

export interface CourseListResult {
  courses: CourseListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  error?: string
}

type RawCourseRow = Omit<Course, 'instructor'> & {
  instructor: User | User[] | null
}

const BASE_SELECT = `
  id,
  instructor_id,
  title,
  title_ar,
  thumbnail_url,
  price,
  category,
  level,
  language,
  status,
  total_lessons,
  total_duration_minutes,
  created_at,
  updated_at,
  instructor:users(id, full_name, full_name_ar, avatar_url)
`

function enrichCourse(
  row: RawCourseRow,
  ratings: CourseRatingRow[],
  enrollmentCount: number,
  priceCalc?: import('@/types').PriceCalculation
): CourseListItem {
  const { avg_rating, review_count } = computeCourseRatingStats(row.id, ratings)
  const { instructor: instructorRaw, ...course } = row
  const instructor = Array.isArray(instructorRaw)
    ? instructorRaw[0] ?? undefined
    : instructorRaw ?? undefined

  const normalizedPrice = normalizeMoneyAmount(course.price)
  const hasDiscount =
    priceCalc != null && priceCalc.total_discount_pct > 0 && normalizedPrice > 0

  return {
    ...course,
    price: normalizedPrice,
    sale_price: hasDiscount ? priceCalc!.final_price : undefined,
    discount_percent_off: hasDiscount
      ? Math.round(priceCalc!.total_discount_pct)
      : undefined,
    instructor,
    enrollment_count: enrollmentCount,
    avg_rating,
    review_count,
  }
}

async function enrichCourseRows(
  supabase: SupabaseClient,
  rows: RawCourseRow[]
): Promise<CourseListItem[]> {
  const courseIds = rows.map((row) => row.id)
  const [ratings, enrollmentCounts, pricesByCourse] = await Promise.all([
    fetchCourseRatings(supabase, courseIds),
    getEnrollmentCountsByCourseIds(courseIds),
    calculatePricesForCourses(courseIds),
  ])

  return rows.map((row) =>
    enrichCourse(
      row,
      ratings,
      enrollmentCounts.get(row.id) ?? 0,
      pricesByCourse.get(row.id)
    )
  )
}

function applyListFilters<T extends { or: (filters: string) => T; eq: (col: string, val: string | number) => T; gt: (col: string, val: number) => T }>(
  query: T,
  params: CourseListParams
): T {
  let filtered = query

  const term = sanitizeSearchTerm(params.q)
  if (term) {
    filtered = filtered.or(`title.ilike.%${term}%,title_ar.ilike.%${term}%`)
  }
  if (params.category) {
    filtered = filtered.eq('category', params.category)
  }
  if (params.level) {
    filtered = filtered.eq('level', params.level)
  }
  if (params.price === 'free') {
    filtered = filtered.eq('price', 0)
  }
  if (params.price === 'paid') {
    filtered = filtered.gt('price', 0)
  }
  if (params.language) {
    filtered = filtered.eq('language', params.language)
  }

  return filtered
}

export async function listPublishedCourses(
  params: CourseListParams = {},
  client?: SupabaseClient
): Promise<CourseListResult> {
  const page = Math.max(1, params.page ?? 1)
  const sort = params.sort ?? 'newest'
  const supabase = client ?? (await createClient())

  let query = supabase
    .from('courses')
    .select(BASE_SELECT, { count: 'exact' })
    .eq('status', 'published')

  query = applyListFilters(query, params)

  if (sort === 'most_enrolled') {
    if (params.limit && params.limit > 0) {
      query = query.order('created_at', { ascending: false }).limit(params.limit)
    }
    const { data, error, count } = await query

    if (error) {
      return {
        courses: [],
        total: 0,
        page,
        pageSize: COURSES_PAGE_SIZE,
        totalPages: 0,
        error: error.message,
      }
    }

    const rows = (data ?? []) as RawCourseRow[]
    const enriched = await enrichCourseRows(supabase, rows)
    enriched.sort((a, b) => b.enrollment_count - a.enrollment_count)

    const total = count ?? enriched.length
    const offset = (page - 1) * COURSES_PAGE_SIZE
    const courses = enriched.slice(offset, offset + COURSES_PAGE_SIZE)

    return {
      courses,
      total,
      page,
      pageSize: COURSES_PAGE_SIZE,
      totalPages: Math.ceil(total / COURSES_PAGE_SIZE),
    }
  }

  switch (sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const from = (page - 1) * COURSES_PAGE_SIZE
  const to = from + COURSES_PAGE_SIZE - 1

  const { data, error, count } = await query.range(from, to)

  if (error) {
    return {
      courses: [],
      total: 0,
      page,
      pageSize: COURSES_PAGE_SIZE,
      totalPages: 0,
      error: error.message,
    }
  }

  const rows = (data ?? []) as RawCourseRow[]
  const courses = await enrichCourseRows(supabase, rows)
  const total = count ?? 0

  return {
    courses,
    total,
    page,
    pageSize: COURSES_PAGE_SIZE,
    totalPages: Math.ceil(total / COURSES_PAGE_SIZE),
  }
}

/**
 * Cached public listing for the /courses page. Uses a cookieless anon client so
 * the result can be memoized with `unstable_cache` (the cookie-based client would
 * force dynamic rendering and a DB hit on every request). Only RLS-public,
 * anonymous data is read, so nothing user-specific is cached.
 */
export function getCachedPublishedCourses(
  params: CourseListParams = {}
): Promise<CourseListResult> {
  return unstable_cache(
    () => listPublishedCourses(params, createPublicClient()),
    ['published-courses', JSON.stringify(params)],
    { revalidate: 60, tags: ['courses'] }
  )()
}

export function parseCourseListParams(
  searchParams: Record<string, string | string[] | undefined>
): CourseListParams {
  const get = (key: string) => {
    const value = searchParams[key]
    return typeof value === 'string' ? value : undefined
  }

  const page = Number(get('page'))
  const level = get('level') as CourseLevel | undefined
  const validLevels: CourseLevel[] = ['beginner', 'intermediate', 'advanced']
  const sort = get('sort') as CourseSort | undefined
  const validSorts: CourseSort[] = ['newest', 'price_asc', 'price_desc', 'most_enrolled']
  const price = get('price') as CoursePriceFilter | undefined
  const validPrices: CoursePriceFilter[] = ['all', 'free', 'paid']

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    q: get('q'),
    category: get('category'),
    level: level && validLevels.includes(level) ? level : undefined,
    price: price && validPrices.includes(price) ? price : undefined,
    language: get('language'),
    sort: sort && validSorts.includes(sort) ? sort : 'newest',
  }
}

export function hasActiveFilters(params: CourseListParams): boolean {
  return Boolean(
    params.q ||
      params.category ||
      params.level ||
      (params.price && params.price !== 'all') ||
      params.language
  )
}
