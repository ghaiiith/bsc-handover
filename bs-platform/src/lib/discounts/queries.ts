import { createAdminClient } from '@/lib/supabase/admin'
import { calculatePricesForCourses } from '@/lib/discounts'
import { listActiveAgreementsWithInstructors } from '@/lib/revenue/agreements'
import type { Coupon, CourseDiscount, PriceCalculation } from '@/types'
import type { CourseListItem } from '@/lib/courses/list-courses'

export interface InstructorCommissionRow {
  id: string
  name: string
  nameAr: string
  instructorPct: number
  adminPct: number
  isCustom: boolean
  courseCount: number
}

export interface CourseCommission {
  adminPct: number
  instructorPct: number
  instructorName: string
  instructorNameAr: string
}

export interface InstructorCourseDiscountRow {
  id: string
  title: string
  title_ar: string
  thumbnail_url?: string
  price: number
  activeDiscount: CourseDiscount | null
  pricing: PriceCalculation
}

export async function getInstructorDiscountData(instructorId: string) {
  const admin = createAdminClient()

  const { data: courses } = await admin
    .from('courses')
    .select('id, title, title_ar, thumbnail_url, price, status')
    .eq('instructor_id', instructorId)
    .eq('status', 'published')
    .order('title')

  const courseIds = (courses ?? []).map((c) => c.id as string)
  const [prices, discountsRes, couponsRes, historyRes] = await Promise.all([
    calculatePricesForCourses(courseIds),
    admin
      .from('course_discounts')
      .select('*')
      .eq('created_by', instructorId)
      .eq('party', 'instructor')
      .order('created_at', { ascending: false }),
    admin
      .from('coupons')
      .select('*, course:courses(id, title, title_ar)')
      .eq('created_by', instructorId)
      .order('created_at', { ascending: false }),
    admin
      .from('course_discounts')
      .select('*, course:courses(id, title, title_ar)')
      .eq('created_by', instructorId)
      .eq('party', 'instructor')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const now = Date.now()
  const activeByCourse = new Map<string, CourseDiscount>()
  for (const row of (discountsRes.data ?? []) as CourseDiscount[]) {
    if (
      row.is_active &&
      new Date(row.starts_at).getTime() <= now &&
      new Date(row.ends_at).getTime() > now &&
      !activeByCourse.has(row.course_id)
    ) {
      activeByCourse.set(row.course_id, row)
    }
  }

  const courseRows: InstructorCourseDiscountRow[] = (courses ?? []).map((c) => {
    const id = c.id as string
    const pricing = prices.get(id) ?? {
      original_price: Number(c.price),
      admin_discount_pct: 0,
      instructor_discount_pct: 0,
      coupon_discount_pct: 0,
      total_discount_pct: 0,
      final_price: Number(c.price),
      savings: 0,
    }
    return {
      id,
      title: c.title as string,
      title_ar: c.title_ar as string,
      thumbnail_url: c.thumbnail_url as string | undefined,
      price: Number(c.price),
      activeDiscount: activeByCourse.get(id) ?? null,
      pricing,
    }
  })

  return {
    courses: courseRows,
    coupons: (couponsRes.data ?? []) as Coupon[],
    history: (historyRes.data ?? []) as CourseDiscount[],
  }
}

export async function getAdminDiscountData() {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const [activeDiscountsRes, couponsRes, logsRes, coursesRes] = await Promise.all([
    admin
      .from('course_discounts')
      .select(
        '*, course:courses(id, title, title_ar, price, instructor:users(id, full_name, full_name_ar))'
      )
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('ends_at', { ascending: true }),
    admin
      .from('coupons')
      .select(
        '*, course:courses(id, title, title_ar), creator:users!coupons_created_by_fkey(id, full_name, full_name_ar)'
      )
      .order('created_at', { ascending: false }),
    admin
      .from('discount_logs')
      .select(
        '*, course:courses(id, title, title_ar), user:users(id, full_name, full_name_ar), coupon:coupons(code)'
      )
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('courses')
      .select('id, title, title_ar, price, status, instructor_id')
      .eq('status', 'published')
      .order('title'),
  ])

  const activeAgreements = await listActiveAgreementsWithInstructors()
  const agreementByInstructor = new Map(
    activeAgreements.map((a) => [a.instructor_id, a])
  )

  // Instructor commission rows for the admin "Instructor commissions" tab.
  const { data: instructorRows } = await admin
    .from('users')
    .select('id, full_name, full_name_ar, commission_instructor_pct')
    .eq('role', 'instructor')
    .order('full_name')

  const publishedCourseRows = (coursesRes.data ?? []) as Array<{
    id: string
    title: string
    title_ar: string
    price: number
    status: string
    instructor_id: string | null
  }>

  const courseCountByInstructor = new Map<string, number>()
  for (const c of publishedCourseRows) {
    if (c.instructor_id) {
      courseCountByInstructor.set(
        c.instructor_id,
        (courseCountByInstructor.get(c.instructor_id) ?? 0) + 1
      )
    }
  }

  const instructors: InstructorCommissionRow[] = (instructorRows ?? []).map(
    (row) => {
      const agreement = agreementByInstructor.get(row.id as string)
      const hasAgreement = agreement != null
      const instructorPct = agreement?.instructor_percentage ?? 0
      return {
        id: row.id as string,
        name: (row.full_name as string) ?? '—',
        nameAr: (row.full_name_ar as string) ?? (row.full_name as string) ?? '—',
        instructorPct,
        adminPct: hasAgreement ? 100 - instructorPct : 0,
        isCustom: hasAgreement,
        courseCount: courseCountByInstructor.get(row.id as string) ?? 0,
      }
    }
  )

  const instructorById = new Map(instructors.map((i) => [i.id, i]))

  // Per-course commission split, keyed by course id, for the create form's cap.
  const courseCommissions: Record<string, CourseCommission> = {}
  for (const c of publishedCourseRows) {
    const instructor = c.instructor_id
      ? instructorById.get(c.instructor_id)
      : undefined
    const instrPct = instructor?.instructorPct ?? 0
    courseCommissions[c.id] = {
      instructorPct: instrPct,
      adminPct: instructor ? 100 - instrPct : 0,
      instructorName: instructor?.name ?? '',
      instructorNameAr: instructor?.nameAr ?? '',
    }
  }

  const activeDiscounts = (activeDiscountsRes.data ?? []) as CourseDiscount[]
  const courseIds = [...new Set(activeDiscounts.map((d) => d.course_id))]
  const prices = await calculatePricesForCourses(courseIds)

  const overview = activeDiscounts.reduce<
    Map<
      string,
      {
        course_id: string
        course?: CourseDiscount['course']
        admin_pct: number
        instructor_pct: number
        pricing?: PriceCalculation
      }
    >
  >((map, row) => {
    const existing = map.get(row.course_id) ?? {
      course_id: row.course_id,
      course: row.course,
      admin_pct: 0,
      instructor_pct: 0,
    }
    if (row.party === 'admin') existing.admin_pct = Number(row.discount_percentage)
    if (row.party === 'instructor') {
      existing.instructor_pct = Number(row.discount_percentage)
    }
    existing.pricing = prices.get(row.course_id)
    map.set(row.course_id, existing)
    return map
  }, new Map())

  return {
    activeDiscounts,
    overview: [...overview.values()],
    coupons: couponsRes.data ?? [],
    logs: logsRes.data ?? [],
    publishedCourses: publishedCourseRows,
    instructors,
    courseCommissions,
    defaultSplit: null,
  }
}

export interface OfferCourseItem extends CourseListItem {
  pricing: PriceCalculation
  ends_at?: string
}

export async function getOfferCourses(options?: {
  minDiscount?: number
  category?: string
  sort?: 'highest_discount' | 'ending_soon' | 'cheapest' | 'rating'
}): Promise<OfferCourseItem[]> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  let courseQuery = admin
    .from('courses')
    .select(
      `
      id, instructor_id, title, title_ar, thumbnail_url, price, category, level, language,
      status, total_lessons, total_duration_minutes, created_at, updated_at,
      instructor:users(id, full_name, full_name_ar, avatar_url)
    `
    )
    .eq('status', 'published')
    .gt('price', 0)

  if (options?.category) {
    courseQuery = courseQuery.eq('category', options.category)
  }

  const { data: courses } = await courseQuery
  if (!courses?.length) return []

  const courseIds = courses.map((c) => c.id as string)
  const [prices, discountsRes] = await Promise.all([
    calculatePricesForCourses(courseIds),
    admin
      .from('course_discounts')
      .select('course_id, ends_at')
      .in('course_id', courseIds)
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now),
  ])

  const endsByCourse = new Map<string, string>()
  for (const d of discountsRes.data ?? []) {
    const cid = d.course_id as string
    const ends = d.ends_at as string
    const prev = endsByCourse.get(cid)
    if (!prev || new Date(ends).getTime() < new Date(prev).getTime()) {
      endsByCourse.set(cid, ends)
    }
  }

  const minDiscount = options?.minDiscount ?? 0
  const items: OfferCourseItem[] = []

  for (const raw of courses) {
    const id = raw.id as string
    const pricing = prices.get(id)
    if (!pricing || pricing.total_discount_pct < minDiscount) continue

    const instructorRaw = raw.instructor
    const instructor = Array.isArray(instructorRaw)
      ? instructorRaw[0]
      : instructorRaw

    items.push({
      id,
      instructor_id: raw.instructor_id as string,
      title: raw.title as string,
      title_ar: raw.title_ar as string,
      thumbnail_url: (raw.thumbnail_url as string | null) ?? undefined,
      price: pricing.original_price,
      category: raw.category as string,
      level: raw.level as CourseListItem['level'],
      language: raw.language as string,
      status: raw.status as CourseListItem['status'],
      slug: id,
      total_lessons: Number(raw.total_lessons ?? 0),
      total_duration_minutes: Number(raw.total_duration_minutes ?? 0),
      created_at: raw.created_at as string,
      updated_at: raw.updated_at as string,
      instructor: instructor
        ? ({
            id: instructor.id,
            full_name: instructor.full_name,
            full_name_ar: instructor.full_name_ar,
            avatar_url: instructor.avatar_url,
          } as CourseListItem['instructor'])
        : undefined,
      enrollment_count: 0,
      avg_rating: 0,
      review_count: 0,
      sale_price: pricing.final_price,
      discount_percent_off: Math.round(pricing.total_discount_pct),
      pricing,
      ends_at: endsByCourse.get(id),
    })
  }

  switch (options?.sort) {
    case 'ending_soon':
      items.sort((a, b) => {
        const ae = a.ends_at ? new Date(a.ends_at).getTime() : Infinity
        const be = b.ends_at ? new Date(b.ends_at).getTime() : Infinity
        return ae - be
      })
      break
    case 'cheapest':
      items.sort((a, b) => a.pricing.final_price - b.pricing.final_price)
      break
    case 'rating':
      items.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
      break
    default:
      items.sort(
        (a, b) => b.pricing.total_discount_pct - a.pricing.total_discount_pct
      )
  }

  return items
}

export async function hasPlatformWideSale(): Promise<{
  active: boolean
  ends_at?: string
}> {
  const admin = createAdminClient()
  const now = Date.now()
  const { data } = await admin
    .from('coupons')
    .select('ends_at, starts_at')
    .eq('scope', 'platform')
    .eq('is_active', true)

  for (const row of data ?? []) {
    if (new Date(row.starts_at as string).getTime() > now) continue
    const endsAt = row.ends_at as string | null
    if (!endsAt || new Date(endsAt).getTime() > now) {
      return { active: true, ends_at: endsAt ?? undefined }
    }
  }

  return { active: false }
}
