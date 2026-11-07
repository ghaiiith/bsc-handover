import 'server-only'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  computeCourseRatingStats,
  fetchCourseRatings,
} from '@/lib/courses/course-list-stats'
import type { CourseListItem } from '@/lib/courses/list-courses'
import { editWithCvBuilder, isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'
import {
  isLearningAssistantConfigured,
  recommendCourses,
} from '@/lib/ai/learning-assistant-server'
import { FIELD_TO_CATEGORIES } from '@/lib/onboarding/constants'
import { parsePreferences } from '@/lib/onboarding/preferences-utils'
import {
  buildBasedOnLabels,
  buildCourseReason,
  translateReason,
} from '@/lib/recommendations/reason-translator'
import type { OnboardingPreferences } from '@/types/onboarding'
import type { Course, User } from '@/types'

export interface RecommendationResult {
  courses: CourseListItem[]
  reasons: Record<string, string>
  basedOn: string[]
}

type RawCourseRow = Course & {
  instructor: User | null
  enrollments: { count: number }[]
}

const BASE_SELECT = `
  id, title, title_ar, category, level, price, description, description_ar,
  thumbnail_url, total_lessons, total_duration_minutes, language, status,
  instructor_id, created_at, updated_at,
  instructor:users(id, full_name, full_name_ar, avatar_url),
  enrollments(count)
`

async function fetchPublishedCourses(): Promise<CourseListItem[]> {
  // Public data only — use the cookieless admin client so this can run
  // safely inside unstable_cache().
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('courses')
    .select(BASE_SELECT)
    .eq('status', 'published')

  const rows = (data ?? []) as unknown as RawCourseRow[]
  const ratings = await fetchCourseRatings(supabase, rows.map((r) => r.id))

  return rows.map((row) => {
    const enrollment_count = row.enrollments?.[0]?.count ?? 0
    const { avg_rating, review_count } = computeCourseRatingStats(row.id, ratings)
    const { enrollments: _e, instructor, ...course } = row
    return {
      ...course,
      instructor: instructor ?? undefined,
      enrollment_count,
      avg_rating,
      review_count,
    } as CourseListItem
  })
}

function buildUserSummary(user: User, prefs: OnboardingPreferences): string {
  const experienceTitles = (user.experience ?? [])
    .map((e) => e.title)
    .filter(Boolean)
    .slice(0, 5)
  const educationFields = (user.education ?? [])
    .map((e) => e.field)
    .filter(Boolean)
    .slice(0, 3)

  return JSON.stringify({
    skills: user.skills ?? [],
    experience_titles: experienceTitles,
    preferred_role: user.preferred_role ?? '',
    education_fields: educationFields,
    goal: prefs.goal,
    fields: prefs.fields,
    level: prefs.level,
    weekly_hours: prefs.weekly_hours,
  })
}

function parseRankedIds(text: string): string[] | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as { ranked_ids?: string[] }
    if (Array.isArray(parsed.ranked_ids)) return parsed.ranked_ids
  } catch {
    /* try array */
  }
  try {
    const arrMatch = text.match(/\[[\s\S]*\]/)
    if (arrMatch) {
      const arr = JSON.parse(arrMatch[0]) as string[]
      if (Array.isArray(arr)) return arr
    }
  } catch {
    return null
  }
  return null
}

async function rankWithAi(
  userSummary: string,
  courses: CourseListItem[],
  enrolledIds: Set<string>
): Promise<string[] | null> {
  if (!isCvBuilderConfigured()) return null

  const available = courses
    .filter((c) => !enrolledIds.has(c.id))
    .map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      level: c.level,
      description: (c.description ?? '').slice(0, 100),
    }))

  const result = await editWithCvBuilder({
    instruction: `Rank these courses by relevance to this user profile.
Return ONLY valid JSON in this exact format: { "ranked_ids": ["id1", "id2", ...] }
Exclude courses the user is already enrolled in.
Consider: user's goal, field, level, and skills.
Include only course IDs from the provided list.`,
    content: JSON.stringify({ user: JSON.parse(userSummary), courses: available }),
  })

  if (!result.ok) return null
  return parseRankedIds(result.result)
}

/**
 * Preferred ranker: the learning_assistant service. The CV-builder path below
 * predates it and is currently unfunded, so this runs first and the CV builder
 * is only a second try.
 */
async function rankWithAssistant(
  user: User,
  prefs: OnboardingPreferences,
  courses: CourseListItem[],
  enrolledIds: Set<string>,
  locale: string
): Promise<string[] | null> {
  if (!isLearningAssistantConfigured()) return null

  const available = courses.filter((c) => !enrolledIds.has(c.id))
  if (available.length === 0) return null

  const result = await recommendCourses({
    student: {
      level: prefs.level,
      skills: (user.skills as string[]) ?? [],
      interests: prefs.fields ?? [],
      target_roles: user.preferred_role ? [user.preferred_role] : [],
      goals: prefs.goal ?? undefined,
    },
    catalog: available.map((c) => ({
      id: c.id,
      title: ((locale === 'ar' ? c.title_ar : c.title) as string) || c.title,
      description: (c.description ?? '').slice(0, 200),
      level: c.level,
      tags: c.category ? [c.category] : [],
      url: `/${locale}/courses/${c.id}`,
    })),
    limit: 12,
  })

  if (!result?.ok || !result.results?.length) return null
  return result.results.map((r) => r.id)
}

function fallbackRank(
  courses: CourseListItem[],
  prefs: OnboardingPreferences,
  enrolledIds: Set<string>
): CourseListItem[] {
  const fieldCategories = new Set(
    (prefs.fields ?? []).flatMap((f) => FIELD_TO_CATEGORIES[f] ?? [])
  )

  return courses
    .filter((c) => !enrolledIds.has(c.id))
    .filter((c) => {
      if (fieldCategories.size === 0) return true
      return fieldCategories.has(c.category)
    })
    .filter((c) => !prefs.level || c.level === prefs.level)
    .sort((a, b) => b.enrollment_count - a.enrollment_count)
}

async function computeRecommendations(
  locale: string,
  user: User,
  enrolledCourseIds: string[]
): Promise<RecommendationResult> {
  const prefs = parsePreferences(user.preferences)
  const enrolledIds = new Set(enrolledCourseIds)
  const allCourses = await fetchPublishedCourses()
  const skills = (user.skills as string[]) ?? []

  let rankedIds: string[] | null = null
  let usedFallback = false

  // Rank for everyone, not only accounts that finished onboarding — most never
  // do, and gating on it left the section empty for nearly every user.
  rankedIds = await rankWithAssistant(user, prefs, allCourses, enrolledIds, locale)

  if (!rankedIds?.length && hasCompletedOnboardingPrefs(prefs)) {
    rankedIds = await rankWithAi(buildUserSummary(user as User, prefs), allCourses, enrolledIds)
  }

  let ordered: CourseListItem[]

  if (rankedIds?.length) {
    const courseMap = new Map(allCourses.map((c) => [c.id, c]))
    ordered = rankedIds
      .map((id) => courseMap.get(id))
      .filter((c): c is CourseListItem => Boolean(c) && !enrolledIds.has(c!.id))
  } else {
    usedFallback = true
    ordered = fallbackRank(allCourses, prefs, enrolledIds)
  }

  const top = ordered.slice(0, 6)
  const reasons: Record<string, string> = {}
  for (const course of top) {
    const reason = buildCourseReason(course, prefs, skills, locale, usedFallback)
    reasons[course.id] = translateReason(reason, locale)
  }

  return {
    courses: top,
    reasons,
    basedOn: buildBasedOnLabels(prefs, skills, locale, usedFallback),
  }
}

function hasCompletedOnboardingPrefs(prefs: OnboardingPreferences): boolean {
  return Boolean(prefs.completed_at && !prefs.skipped)
}

export async function getCourseRecommendations(
  userId: string,
  locale: string
): Promise<RecommendationResult> {
  // Cookie-dependent reads must happen OUTSIDE unstable_cache(). We fetch the
  // dynamic (per-user) data here and pass it into the cached compute function.
  const supabase = await createClient()

  // userId is the session user; own-row read via get_my_profile RPC.
  const { data: rpcData } = await supabase.rpc('get_my_profile')
  const user = Array.isArray(rpcData) ? rpcData[0] : rpcData

  if (!user) {
    return { courses: [], reasons: {}, basedOn: [] }
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', userId)

  const enrolledCourseIds = (enrollments ?? []).map((e) => e.course_id as string)

  const cached = unstable_cache(
    () => computeRecommendations(locale, user as User, enrolledCourseIds),
    [`recommendations-${userId}-${locale}`],
    { revalidate: 1800, tags: [`recommendations-${userId}`] }
  )
  return cached()
}

export function getRecommendationsCacheTag(userId: string): string {
  return `recommendations-${userId}`
}
