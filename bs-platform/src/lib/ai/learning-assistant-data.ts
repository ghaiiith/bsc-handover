import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { LaStudent, LaCourse, LaJob } from '@/lib/ai/learning-assistant-server'

function levelFromExperience(years: number | null): 'beginner' | 'intermediate' | 'advanced' {
  if (!years || years < 2) return 'beginner'
  if (years < 5) return 'intermediate'
  return 'advanced'
}

/** Build the learning_assistant Student payload from a platform user profile. */
export async function buildAssistantStudent(userId: string): Promise<LaStudent> {
  const admin = createAdminClient()
  const { data: u } = await admin
    .from('users')
    .select('full_name, skills, interests, preferred_role, location, years_of_experience, headline, bio')
    .eq('id', userId)
    .maybeSingle()

  const { data: enr } = await admin
    .from('enrollments')
    .select('course:courses(title, skills)')
    .eq('student_id', userId)
    .limit(50)

  const taken = (enr ?? [])
    .map((e) => {
      const c = Array.isArray(e.course) ? e.course[0] : e.course
      return { title: (c?.title as string) ?? '', skills_taught: (c?.skills as string[]) ?? [] }
    })
    .filter((t) => t.title)

  return {
    id: userId,
    name: (u?.full_name as string) ?? undefined,
    level: levelFromExperience((u?.years_of_experience as number | null) ?? null),
    skills: (u?.skills as string[]) ?? [],
    interests: Array.isArray(u?.interests) ? (u!.interests as string[]) : [],
    target_roles: u?.preferred_role ? [u.preferred_role as string] : [],
    goals: (u?.headline as string) || (u?.bio as string) || undefined,
    location: (u?.location as string) ?? undefined,
    taken,
  }
}

/** Published courses as the assistant's catalog (it recommends ONLY from this). */
export async function getAssistantCatalog(locale: string): Promise<LaCourse[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('courses')
    // `courses` has no `skills` column — asking for one made PostgREST fail the
    // whole select, so the assistant was handed an EMPTY catalog and could never
    // recommend a course. The taught skills live in `learning_outcomes` (jsonb).
    .select('id, title, title_ar, description, description_ar, learning_outcomes, level, category')
    .eq('status', 'published')
    .limit(200)
  const ar = locale === 'ar'
  return (data ?? []).map((c) => ({
    id: c.id as string,
    title: ((ar ? c.title_ar : c.title) as string) || (c.title as string),
    description: ((ar ? c.description_ar : c.description) as string) || undefined,
    level: (c.level as string) ?? undefined,
    skills_taught: Array.isArray(c.learning_outcomes)
      ? (c.learning_outcomes as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
    tags: c.category ? [c.category as string] : [],
    url: `/${locale}/courses/${c.id}`,
  }))
}

/** Recent active jobs for the assistant (capped to stay within its size limit). */
export async function getAssistantJobs(locale: string): Promise<LaJob[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('jobs')
    .select('id, title, title_ar, company_name, city, job_type, skills, contact_link, is_external, salary_min, salary_max')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(80)
  const ar = locale === 'ar'
  return (data ?? []).map((j) => ({
    id: j.id as string,
    title: ((ar ? j.title_ar : j.title) as string) || (j.title as string),
    company: (j.company_name as string) ?? undefined,
    city: (j.city as string) ?? undefined,
    job_type: (j.job_type as string) ?? undefined,
    required_skills: (j.skills as string[]) ?? [],
    // External jobs link to their source; platform jobs to the in-app detail page.
    application_url: j.is_external
      ? ((j.contact_link as string) ?? `/${locale}/jobs/${j.id}`)
      : `/${locale}/jobs/${j.id}`,
    salary_min_iqd: (j.salary_min as number) ?? undefined,
    salary_max_iqd: (j.salary_max as number) ?? undefined,
  }))
}
