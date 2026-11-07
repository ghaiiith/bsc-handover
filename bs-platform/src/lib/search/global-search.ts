import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'

export type GlobalSearchResultType =
  | 'course'
  | 'job'
  | 'service'
  | 'user'
  | 'coupon'
  | 'certificate'

export interface GlobalSearchResult {
  id: string
  type: GlobalSearchResultType
  title: string
  titleAr?: string
  subtitle?: string
  href: string
}

export interface GlobalSearchResponse {
  results: GlobalSearchResult[]
  query: string
}

const LIMIT_PER_TYPE = 5

export async function globalSearch(
  query: string,
  locale: string,
  userId?: string,
  userRole?: string
): Promise<GlobalSearchResponse> {
  const term = sanitizeSearchTerm(query)
  if (!term || term.length < 2) {
    return { results: [], query: term }
  }

  const pattern = `%${term}%`
  const supabase = await createClient()
  const admin = createAdminClient()
  const isAr = locale === 'ar'
  const results: GlobalSearchResult[] = []

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, title_ar, slug, status')
    .or(`title.ilike.${pattern},title_ar.ilike.${pattern}`)
    .eq('status', 'published')
    .limit(LIMIT_PER_TYPE)

  for (const course of courses ?? []) {
    results.push({
      id: course.id as string,
      type: 'course',
      title: course.title as string,
      titleAr: course.title_ar as string,
      href: `/${locale}/courses/${course.slug}`,
    })
  }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, title_ar, slug, company_name')
    .or(`title.ilike.${pattern},title_ar.ilike.${pattern},company_name.ilike.${pattern}`)
    .eq('status', 'active')
    .limit(LIMIT_PER_TYPE)

  for (const job of jobs ?? []) {
    results.push({
      id: job.id as string,
      type: 'job',
      title: job.title as string,
      titleAr: job.title_ar as string,
      subtitle: job.company_name as string,
      href: `/${locale}/jobs/${job.slug}`,
    })
  }

  const { data: services } = await supabase
    .from('services')
    .select('id, title, title_ar, slug')
    .or(`title.ilike.${pattern},title_ar.ilike.${pattern}`)
    .eq('status', 'active')
    .limit(LIMIT_PER_TYPE)

  for (const service of services ?? []) {
    results.push({
      id: service.id as string,
      type: 'service',
      title: service.title as string,
      titleAr: service.title_ar as string,
      href: `/${locale}/services/${service.slug}`,
    })
  }

  if (userRole === 'admin') {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name, full_name_ar, email, role')
      .or(`full_name.ilike.${pattern},full_name_ar.ilike.${pattern},email.ilike.${pattern}`)
      .limit(LIMIT_PER_TYPE)

    for (const user of users ?? []) {
      results.push({
        id: user.id as string,
        type: 'user',
        title: (user.full_name as string) ?? (user.email as string),
        titleAr: user.full_name_ar as string,
        subtitle: user.role as string,
        href: `/${locale}/admin/users?q=${encodeURIComponent(term)}`,
      })
    }
  }

  if (userId) {
    const { data: certs } = await supabase
      .from('certificates')
      .select('id, course_title, course_title_ar, verification_code')
      .eq('student_id', userId)
      .or(`course_title.ilike.${pattern},course_title_ar.ilike.${pattern},verification_code.ilike.${pattern}`)
      .limit(LIMIT_PER_TYPE)

    for (const cert of certs ?? []) {
      results.push({
        id: cert.id as string,
        type: 'certificate',
        title: cert.course_title as string,
        titleAr: cert.course_title_ar as string,
        subtitle: cert.verification_code as string,
        href: `/${locale}/certificate/${cert.verification_code}`,
      })
    }
  }

  if (userRole === 'admin' || userRole === 'instructor') {
    const { data: coupons } = await admin
      .from('coupons')
      .select('id, code, discount_percent')
      .ilike('code', pattern)
      .limit(LIMIT_PER_TYPE)

    for (const coupon of coupons ?? []) {
      results.push({
        id: coupon.id as string,
        type: 'coupon',
        title: coupon.code as string,
        subtitle: `${coupon.discount_percent}%`,
        href: `/${locale}/${userRole === 'admin' ? 'admin' : 'instructor'}/discounts`,
      })
    }
  }

  return {
    results: results.map((r) => ({
      ...r,
      title: isAr && r.titleAr ? r.titleAr : r.title,
    })),
    query: term,
  }
}
