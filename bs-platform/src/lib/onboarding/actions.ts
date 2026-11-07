'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUserAuthClaims } from '@/lib/auth/sync-user-claims'
import { syncAndRefreshAuthClaims } from '@/lib/auth/session-actions'
import { getPostOnboardingRedirect } from '@/lib/onboarding/redirect'
import { buildRoleRequestPromptUrl } from '@/lib/onboarding/role-request-utils'
import { interestsToFields } from '@/lib/onboarding/constants'
import {
  completeOnboardingSchema,
} from '@/lib/onboarding/schema'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import type { UserRole } from '@/types'
import type { OnboardingMeta } from '@/types/onboarding'

export type OnboardingActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: 'validation_failed' | 'unauthorized' | 'profile_not_found' | 'save_failed' }

interface OnboardingExistingRow {
  id: string
  role: UserRole
  full_name: string | null
  onboarding_completed: boolean
  links: unknown
  onboarding_meta: unknown
  preferences: unknown
}

async function fetchOnboardingExistingRow(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<OnboardingExistingRow | null> {
  const { data, error } = await supabase.rpc('get_my_profile')
  if (error) {
    console.error('[onboarding] get_my_profile failed:', error.message)
    return null
  }

  const row = (Array.isArray(data) ? data[0] : data) as OnboardingExistingRow | null
  return row?.id ? row : null
}

export async function completeOnboarding(
  locale: string,
  raw: unknown
): Promise<OnboardingActionResult> {
  const parsed = completeOnboardingSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('[onboarding] validation failed:', parsed.error.flatten())
    return { ok: false, error: 'validation_failed' }
  }

  const input = parsed.data
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'unauthorized' }
  }

  const existing = await fetchOnboardingExistingRow(supabase)

  if (!existing) {
    return { ok: false, error: 'profile_not_found' }
  }

  if (existing.onboarding_completed) {
    const role = existing.role as UserRole
    return {
      ok: true,
      redirectTo: getPostOnboardingRedirect({
        locale,
        role,
        accountType: input.account_type,
      }),
    }
  }

  const now = new Date().toISOString()
  const meta: OnboardingMeta = {
    ...(typeof existing.onboarding_meta === 'object' && existing.onboarding_meta
      ? (existing.onboarding_meta as OnboardingMeta)
      : {}),
    role_request_submitted: false,
    role_request_declined: false,
  }

  const updatePayload: Record<string, unknown> = {
    account_type: input.account_type,
    onboarding_completed: true,
    onboarding_completed_at: now,
    onboarding_updated_at: now,
    discovery_source: input.discovery_source,
    discovery_source_other:
      input.discovery_source === 'other' ? input.discovery_source_other ?? null : null,
    interests: [] as string[],
    primary_goal: null,
    skill_level: null,
    instructor_intent: null,
    company_intent: null,
    freelancer_intent: null,
    onboarding_company_name: null,
    onboarding_company_industry: null,
    onboarding_company_size: null,
    onboarding_meta: meta,
  }

  if (input.account_type === 'student' && input.student) {
    updatePayload.primary_goal = input.student.primary_goal
    updatePayload.skill_level = input.student.skill_level
    updatePayload.interests = input.student.interests
  }

  // Report BS-26: project the onboarding answers into `users.preferences`, which
  // is what the course-recommendation engine reads. Without this the selected
  // interests were stored but never influenced anything.
  const selectedInterests =
    input.account_type === 'freelancer'
      ? input.freelancer?.service_categories
      : input.account_type === 'instructor'
        ? input.instructor?.interests
        : input.student?.interests
  const level = input.student?.skill_level ?? input.freelancer?.skill_level ?? undefined
  const existingPreferences =
    typeof existing.preferences === 'object' && existing.preferences
      ? (existing.preferences as Record<string, unknown>)
      : {}
  updatePayload.preferences = {
    ...existingPreferences,
    fields: interestsToFields(selectedInterests),
    ...(level ? { level } : {}),
    completed_at: now,
    skipped: false,
  }

  if (input.account_type === 'instructor' && input.instructor) {
    const i = input.instructor
    updatePayload.instructor_intent = i.instructor_intent
    updatePayload.interests = i.interests
    meta.instructor_experience = i.instructor_experience
    meta.instructor_upload_plan = i.instructor_upload_plan
    meta.instructor_links = {
      linkedin: i.linkedin || undefined,
      portfolio: i.portfolio || undefined,
      youtube: i.youtube || undefined,
      website: i.website || undefined,
    }
    const existingLinks =
      typeof existing.links === 'object' && existing.links
        ? (existing.links as Record<string, string>)
        : {}
    updatePayload.links = {
      ...existingLinks,
      ...(i.linkedin ? { linkedin: i.linkedin } : {}),
      ...(i.portfolio ? { website: i.portfolio } : {}),
      ...(i.youtube ? { twitter: i.youtube } : {}),
      ...(i.website ? { website: i.website } : {}),
    }
  }

  if (input.account_type === 'company' && input.company) {
    const c = input.company
    updatePayload.company_intent = c.company_intent
    updatePayload.onboarding_company_name = c.company_name
    updatePayload.onboarding_company_industry = c.company_industry
    updatePayload.onboarding_company_size = c.company_size
    meta.company_website = c.company_website || undefined
    meta.company_linkedin = c.company_linkedin || undefined
    // Report BS-43: activate the company role immediately so registration lands
    // on the Jobs workspace (not a pending page). Posted jobs still go through
    // admin approval (report BS-53), which keeps the platform safe. Seed the
    // company profile name from onboarding (report BS-47).
    if (existing.role === 'student') {
      updatePayload.role = 'company'
      updatePayload.company_name = c.company_name
      updatePayload.company_industry = c.company_industry
      updatePayload.company_size = c.company_size
    }
  }

  if (input.account_type === 'freelancer' && input.freelancer) {
    const f = input.freelancer
    updatePayload.freelancer_intent = f.freelancer_intent
    // Report BS-44: activate the service-provider role immediately so
    // registration lands on the Services workspace. Services still require
    // admin approval before they publish (report BS-20).
    if (existing.role === 'student') {
      updatePayload.role = 'freelancer'
    }
    updatePayload.interests = f.service_categories
    updatePayload.skill_level = f.skill_level
    updatePayload.headline = f.professional_headline
    meta.freelancer_availability = f.availability
    meta.freelancer_links = {
      linkedin: f.linkedin || undefined,
      portfolio: f.portfolio || undefined,
      github: f.github || undefined,
      website: f.website || undefined,
    }
    const existingLinks =
      typeof existing.links === 'object' && existing.links
        ? (existing.links as Record<string, string>)
        : {}
    updatePayload.links = {
      ...existingLinks,
      ...(f.linkedin ? { linkedin: f.linkedin } : {}),
      ...(f.portfolio ? { portfolio: f.portfolio } : {}),
      ...(f.github ? { github: f.github } : {}),
      ...(f.website ? { website: f.website } : {}),
    }
  }

  updatePayload.onboarding_meta = meta

  // public.users deliberately has no UPDATE grant for the authenticated role
  // (self-escalation lockdown, migrations 0440/065) — onboarding fields are
  // written through the service-role client, scoped to the verified user id.
  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from('users')
    .update(updatePayload)
    .eq('id', user.id)

  if (updateError) {
    console.error('[onboarding] update failed:', updateError.message)
    return { ok: false, error: 'save_failed' }
  }

  await syncUserAuthClaims(user.id)
  await syncAndRefreshAuthClaims()

  // Company/freelancer now get their role immediately (reports BS-43/44), so use
  // the newly-assigned role for routing. Instructor still routes through the
  // request prompt (role stays student until an admin approves).
  const effectiveRole = (updatePayload.role as UserRole | undefined) ?? (existing.role as UserRole)
  const [instructorReq, companyReq, freelancerReq] = await Promise.all([
    getMyInstructorRequest(user.id),
    getMyCompanyAffiliationRequest(user.id),
    getMyFreelancerRequest(user.id),
  ])

  const redirectTo = getPostOnboardingRedirect({
    locale,
    role: effectiveRole,
    accountType: input.account_type,
    instructorRequestStatus: instructorReq?.status ?? null,
    companyRequestStatus: companyReq?.status ?? null,
    freelancerRequestStatus: freelancerReq?.status ?? null,
  })

  revalidatePath(`/${locale}/onboarding`)
  revalidatePath(`/${locale}/dashboard`)
  revalidatePath(`/${locale}/dashboard`)

  return { ok: true, redirectTo }
}
