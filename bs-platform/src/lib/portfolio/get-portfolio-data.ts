import 'server-only'

import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl, truncateDescription } from '@/lib/seo/metadata'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'
import { recordPortfolioViewFromRequest } from '@/lib/portfolio/record-portfolio-view'
import { getPortfolioCertificates } from '@/lib/certificates/get-certificates'
import type {
  PortfolioCompletedCourse,
  PortfolioData,
  PortfolioProject,
  PortfolioStats,
  PortfolioTaughtCourse,
  PortfolioUser,
} from '@/types/portfolio'
import type {
  EducationItem,
  ExperienceItem,
  ProfileLinks,
  ProjectItem,
} from '@/types/profile'
import type { UserRole } from '@/types'
import { resolvePortfolioVariant } from '@/lib/portfolio/portfolio-theme'
import { getEnrollmentCountsByCourseIds, countEnrollmentsForCourses } from '@/lib/courses/enrollment-count'
import {
  computeCourseRatingStats,
  fetchCourseRatings,
} from '@/lib/courses/course-list-stats'

async function fetchPortfolioUser(slug: string): Promise<PortfolioUser | null> {
  const admin = createAdminClient()

  const { data: userRow, error } = await admin
    .from('users')
    .select(`
      id, full_name, full_name_ar, avatar_url, headline, bio, bio_ar,
      skills, experience, education, projects, links,
      location, years_of_experience, availability, created_at,
      portfolio_is_public, portfolio_slug, portfolio_template_id, is_active, role
    `)
    .eq('portfolio_slug', slug)
    .maybeSingle()

  if (error || !userRow) return null

  const user = userRow as PortfolioUser & {
    portfolio_is_public: boolean
    portfolio_slug: string | null
    is_active: boolean
  }

  if (!user.portfolio_is_public || !user.is_active) {
    return null
  }

  return {
    id: user.id,
    full_name: user.full_name,
    full_name_ar: user.full_name_ar,
    avatar_url: user.avatar_url,
    headline: user.headline,
    bio: user.bio,
    bio_ar: user.bio_ar,
    skills: (user.skills as string[]) ?? [],
    experience: (user.experience as ExperienceItem[]) ?? [],
    education: (user.education as EducationItem[]) ?? [],
    projects: ((user.projects as ProjectItem[]) ?? []).map(mapProject),
    links: (user.links as ProfileLinks) ?? {},
    location: user.location,
    years_of_experience: user.years_of_experience,
    availability: user.availability ?? false,
    created_at: user.created_at,
    portfolio_slug: user.portfolio_slug,
    portfolio_is_public: user.portfolio_is_public,
    portfolio_template_id: user.portfolio_template_id ?? null,
    role: (user.role as UserRole) ?? 'student',
  }
}

async function getCompletedCourses(
  userId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<PortfolioCompletedCourse[]> {
  const { data: enrollments } = await admin
    .from('enrollments')
    .select(`
      course_id,
      courses(
        id, title, title_ar, thumbnail_url, category, status,
        instructor:users(full_name, full_name_ar)
      )
    `)
    .eq('student_id', userId)

  if (!enrollments?.length) return []

  const courseIds = enrollments
    .map((e) => {
      const c = e.courses as unknown as { id: string; status: string } | null
      return c?.status === 'published' ? c.id : null
    })
    .filter(Boolean) as string[]

  if (!courseIds.length) return []

  const [{ data: allLessons }, { data: completedProgress }] = await Promise.all([
    admin.from('lessons').select('id, course_id').in('course_id', courseIds),
    admin
      .from('lesson_progress')
      .select('lesson_id')
      .eq('student_id', userId)
      .eq('completed', true),
  ])

  const completedSet = new Set((completedProgress ?? []).map((r) => r.lesson_id as string))
  const lessonsByCourse = new Map<string, string[]>()

  for (const lesson of allLessons ?? []) {
    const cid = lesson.course_id as string
    const list = lessonsByCourse.get(cid) ?? []
    list.push(lesson.id as string)
    lessonsByCourse.set(cid, list)
  }

  const completed: PortfolioCompletedCourse[] = []

  for (const enrollment of enrollments) {
    const courseRaw = enrollment.courses as unknown as
      | {
          id: string
          title: string
          title_ar: string
          thumbnail_url: string | null
          category: string
          status: string
          instructor: { full_name: string; full_name_ar?: string | null } | null
        }
      | null

    if (!courseRaw || courseRaw.status !== 'published') continue

    const lessonIds = lessonsByCourse.get(courseRaw.id) ?? []
    if (lessonIds.length === 0) continue

    const allDone = lessonIds.every((id) => completedSet.has(id))
    if (!allDone) continue

    const instructor = courseRaw.instructor
    completed.push({
      id: courseRaw.id,
      title: courseRaw.title,
      title_ar: courseRaw.title_ar,
      thumbnail_url: courseRaw.thumbnail_url,
      category: courseRaw.category,
      instructor_name: instructor?.full_name ?? '',
      instructor_name_ar: instructor?.full_name_ar ?? undefined,
    })
  }

  return completed.slice(0, 6)
}

async function getInstructorPortfolioCourses(
  userId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<{
  taughtCourses: PortfolioTaughtCourse[]
  taughtCoursesCount: number
  totalStudents: number
  avgCourseRating: number
}> {
  const { data: courses, error } = await admin
    .from('courses')
    .select('id, title, title_ar, thumbnail_url, category, total_lessons, status')
    .eq('instructor_id', userId)
    .eq('status', 'published')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[portfolio] getInstructorPortfolioCourses:', error.message)
    return {
      taughtCourses: [],
      taughtCoursesCount: 0,
      totalStudents: 0,
      avgCourseRating: 0,
    }
  }

  if (!courses?.length) {
    return {
      taughtCourses: [],
      taughtCoursesCount: 0,
      totalStudents: 0,
      avgCourseRating: 0,
    }
  }

  const courseIds = courses.map((c) => c.id as string)
  const [enrollmentCounts, ratings, totalStudents] = await Promise.all([
    getEnrollmentCountsByCourseIds(courseIds),
    fetchCourseRatings(admin, courseIds),
    countEnrollmentsForCourses(courseIds),
  ])

  const taughtCourses = courses.map((course) => {
    const id = course.id as string
    const { avg_rating } = computeCourseRatingStats(id, ratings)
    return {
      id,
      title: course.title as string,
      title_ar: course.title_ar as string,
      thumbnail_url: (course.thumbnail_url as string | null) ?? null,
      category: course.category as string,
      enrollment_count: enrollmentCounts.get(id) ?? 0,
      avg_rating,
      total_lessons: Number(course.total_lessons ?? 0),
    }
  })

  const reviewRatings = ratings.map((r) => r.rating)
  const avgCourseRating =
    reviewRatings.length > 0
      ? Math.round(
          (reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length) * 10
        ) / 10
      : 0

  return {
    taughtCourses: taughtCourses.slice(0, 6),
    taughtCoursesCount: courses.length,
    totalStudents,
    avgCourseRating,
  }
}

function buildPortfolioStats(
  user: PortfolioUser,
  completedCourses: PortfolioCompletedCourse[],
  certificatesCount: number,
  instructorMetrics?: {
    taughtCoursesCount: number
    totalStudents: number
    avgCourseRating: number
  }
): PortfolioStats {
  return {
    completedCoursesCount: completedCourses.length,
    certificatesCount,
    skillsCount: user.skills.length,
    projectsCount: user.projects.length,
    taughtCoursesCount: instructorMetrics?.taughtCoursesCount ?? 0,
    totalStudents: instructorMetrics?.totalStudents ?? 0,
    avgCourseRating: instructorMetrics?.avgCourseRating ?? 0,
  }
}

async function userHasDefaultCv(
  userId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<boolean> {
  const { data } = await admin
    .from('cv_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (data) return true

  const { count } = await admin
    .from('cv_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return (count ?? 0) > 0
}

function mapProject(p: ProjectItem): PortfolioProject {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    technologies: p.technologies ?? [],
    url: p.url,
    github_url: p.github_url,
  }
}

export async function loadPortfolioPage(slug: string): Promise<PortfolioData> {
  const user = await fetchPortfolioUser(slug)
  if (!user) notFound()

  const admin = createAdminClient()
  const supabase = await createClient()
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()

  // Report BS-35: the portfolio URL is shareable with anyone. Visibility is the
  // owner's own `portfolio_is_public` switch, enforced in fetchPortfolioUser —
  // no role gate, otherwise a shared link would 404 for everyone logged out.

  const isInstructor = user.role === 'instructor' || user.role === 'admin'

  const [completedCourses, hasDefaultCv, certificates, instructorData] = await Promise.all([
    getCompletedCourses(user.id, admin),
    userHasDefaultCv(user.id, admin),
    getPortfolioCertificates(user.id),
    isInstructor
      ? getInstructorPortfolioCourses(user.id, admin)
      : Promise.resolve({
          taughtCourses: [] as PortfolioTaughtCourse[],
          taughtCoursesCount: 0,
          totalStudents: 0,
          avgCourseRating: 0,
        }),
  ])

  const variant = resolvePortfolioVariant(user.role)
  const stats = buildPortfolioStats(user, completedCourses, certificates.length, isInstructor
    ? {
        taughtCoursesCount: instructorData.taughtCoursesCount,
        totalStudents: instructorData.totalStudents,
        avgCourseRating: instructorData.avgCourseRating,
      }
    : undefined)

  if (viewer?.id !== user.id) {
    const h = await headers()
    const pseudoRequest = new Request('http://local', { headers: h })
    await recordPortfolioViewFromRequest(user.id, viewer?.id ?? null, pseudoRequest)
  }

  return {
    user,
    variant,
    stats,
    completedCourses,
    taughtCourses: instructorData.taughtCourses,
    certificates,
    hasDefaultCv,
    viewStats: null,
  }
}

export async function buildPortfolioMetadata(
  slug: string,
  locale: string
): Promise<Metadata> {
  const user = await fetchPortfolioUser(slug)
  if (!user) {
    // The root layout title template already appends "| Business Skills" — do
    // NOT add it here or it doubles (report BS-84).
    return { title: 'Portfolio' }
  }

  const isAr = locale === 'ar'
  const name = isAr ? user.full_name_ar ?? user.full_name : user.full_name
  const description = truncateDescription(
    (isAr ? user.bio_ar ?? user.bio : user.bio ?? user.headline) ?? ''
  )
  const appUrl = getAppUrl()
  const path = `/portfolio/${slug}`
  const url = `${appUrl}/${locale}${path}`
  const ogImage = user.avatar_url ?? `${appUrl}/opengraph-image`

  return {
    // No brand suffix — the layout title template adds it (report BS-84).
    title: `${name} — Portfolio`,
    description: description || `${name} on ${BRAND_FULL_NAME}`,
    alternates: {
      canonical: url,
      languages: {
        ar: `${appUrl}/ar${path}`,
        en: `${appUrl}/en${path}`,
      },
    },
    openGraph: {
      title: `${name} — Portfolio | ${BRAND_FULL_NAME}`,
      description: description || `${name} on ${BRAND_FULL_NAME}`,
      url,
      siteName: BRAND_FULL_NAME,
      locale: isAr ? 'ar_IQ' : 'en_US',
      type: 'profile',
      images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — Portfolio | ${BRAND_FULL_NAME}`,
      description: description || `${name} on ${BRAND_FULL_NAME}`,
      images: [ogImage],
    },
  }
}
