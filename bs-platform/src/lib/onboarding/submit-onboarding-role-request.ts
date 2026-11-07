'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInstructorRequestSubmittedNotifications } from '@/lib/instructor/send-instructor-notifications'
import { createNotifications } from '@/lib/notifications'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import type { OnboardingAccountType, OnboardingMeta } from '@/types/onboarding'
import type { UserRole } from '@/types'

interface OnboardingProfileRow {
  id: string
  role: UserRole
  full_name: string | null
  account_type: OnboardingAccountType | null
  instructor_intent: string | null
  company_intent: string | null
  freelancer_intent: string | null
  interests: string[] | null
  skill_level: string | null
  headline: string | null
  onboarding_company_name: string | null
  onboarding_company_industry: string | null
  onboarding_company_size: string | null
  onboarding_meta: OnboardingMeta | null
}

async function fetchOnboardingProfile(): Promise<OnboardingProfileRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_profile')
  if (error) {
    console.error('[onboarding/role-request] get_my_profile failed:', error.message)
    return null
  }
  const row = (Array.isArray(data) ? data[0] : data) as OnboardingProfileRow | null
  return row?.id ? row : null
}

function buildInstructorReasonFromProfile(profile: OnboardingProfileRow): string {
  const meta = profile.onboarding_meta ?? {}
  const parts = [
    `Intent: ${profile.instructor_intent ?? 'n/a'}`,
    `Content areas: ${(profile.interests ?? []).join(', ') || 'n/a'}`,
    `Experience: ${meta.instructor_experience ?? 'n/a'}`,
    `Upload plan: ${meta.instructor_upload_plan ?? 'n/a'}`,
  ]
  const links = meta.instructor_links
  if (links?.linkedin) parts.push(`LinkedIn: ${links.linkedin}`)
  if (links?.portfolio) parts.push(`Portfolio: ${links.portfolio}`)
  if (links?.youtube) parts.push(`YouTube: ${links.youtube}`)
  if (links?.website) parts.push(`Website: ${links.website}`)
  return parts.join('\n')
}

function buildCompanyReasonFromProfile(profile: OnboardingProfileRow): string {
  const meta = profile.onboarding_meta ?? {}
  const parts = [
    `Goal: ${profile.company_intent ?? 'n/a'}`,
    `Industry: ${profile.onboarding_company_industry ?? 'n/a'}`,
    `Size: ${profile.onboarding_company_size ?? 'n/a'}`,
  ]
  if (meta.company_website) parts.push(`Website: ${meta.company_website}`)
  if (meta.company_linkedin) parts.push(`LinkedIn: ${meta.company_linkedin}`)
  return parts.join('\n')
}

function buildFreelancerReasonFromProfile(profile: OnboardingProfileRow): string {
  const meta = profile.onboarding_meta ?? {}
  const parts = [
    `Intent: ${profile.freelancer_intent ?? 'n/a'}`,
    `Categories: ${(profile.interests ?? []).join(', ') || 'n/a'}`,
    `Skill level: ${profile.skill_level ?? 'n/a'}`,
    `Availability: ${meta.freelancer_availability ?? 'n/a'}`,
    `Headline: ${profile.headline ?? 'n/a'}`,
  ]
  const links = meta.freelancer_links
  if (links?.linkedin) parts.push(`LinkedIn: ${links.linkedin}`)
  if (links?.portfolio) parts.push(`Portfolio: ${links.portfolio}`)
  if (links?.github) parts.push(`GitHub: ${links.github}`)
  if (links?.website) parts.push(`Website: ${links.website}`)
  return parts.join('\n')
}

async function markRoleRequestMeta(
  userId: string,
  patch: Pick<OnboardingMeta, 'role_request_submitted' | 'role_request_declined'>
): Promise<void> {
  const profile = await fetchOnboardingProfile()
  if (!profile) return

  const meta: OnboardingMeta = {
    ...(profile.onboarding_meta ?? {}),
    ...patch,
  }

  // authenticated role has no UPDATE grant on public.users — write via service role.
  const admin = createAdminClient()
  await admin.from('users').update({ onboarding_meta: meta }).eq('id', userId)
}

export type SubmitOnboardingRoleRequestResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'profile_not_found' | 'invalid_account_type' | 'already_has_role' | 'pending_exists' | 'submit_failed' }

export async function submitOnboardingRoleRequest(
  locale: string
): Promise<SubmitOnboardingRoleRequestResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const profile = await fetchOnboardingProfile()
  if (!profile) return { ok: false, error: 'profile_not_found' }

  const accountType = profile.account_type
  if (!accountType || accountType === 'student') {
    return { ok: false, error: 'invalid_account_type' }
  }

  const fullName = profile.full_name ?? 'User'

  if (accountType === 'instructor') {
    if (profile.role === 'instructor' || profile.role === 'admin') {
      return { ok: false, error: 'already_has_role' }
    }
    const existing = await getMyInstructorRequest(user.id)
    if (existing?.status === 'pending') return { ok: false, error: 'pending_exists' }

    const reason = buildInstructorReasonFromProfile(profile)
    const { error } = await supabase.from('instructor_requests').insert({
      user_id: user.id,
      reason,
      status: 'pending',
    })
    if (error) return { ok: false, error: 'submit_failed' }

    const { data: created } = await supabase
      .from('instructor_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (created?.id) {
      after(() =>
        sendInstructorRequestSubmittedNotifications(created.id as string, fullName)
      )
    }
  }

  if (accountType === 'company') {
    if (profile.role === 'company' || profile.role === 'admin') {
      return { ok: false, error: 'already_has_role' }
    }
    const existing = await getMyCompanyAffiliationRequest(user.id)
    if (existing?.status === 'pending') return { ok: false, error: 'pending_exists' }

    const companyName = profile.onboarding_company_name?.trim()
    if (!companyName || companyName.length < 2) {
      return { ok: false, error: 'submit_failed' }
    }

    const reason = buildCompanyReasonFromProfile(profile)
    const { error } = await supabase.from('company_affiliation_requests').insert({
      user_id: user.id,
      company_name: companyName,
      company_name_ar: null,
      reason,
      status: 'pending',
    })
    if (error) return { ok: false, error: 'submit_failed' }

    const admin = createAdminClient()
    const { data: admins } = await admin.from('users').select('id').eq('role', 'admin')
    if (admins?.length) {
      after(() =>
        createNotifications(
          admins.map((a) => ({
            userId: a.id,
            title: 'New company affiliation request',
            titleAr: 'طلب انتماء شركة جديد',
            body: `${fullName} requested affiliation for ${companyName}.`,
            bodyAr: `طلب ${fullName} الانتماء لشركة ${companyName}.`,
            type: buildNotificationType(NotificationKind.companyRequest),
          }))
        )
      )
    }
  }

  if (accountType === 'freelancer') {
    if (profile.role === 'freelancer' || profile.role === 'admin') {
      return { ok: false, error: 'already_has_role' }
    }
    const existing = await getMyFreelancerRequest(user.id)
    if (existing?.status === 'pending') return { ok: false, error: 'pending_exists' }

    const reason = buildFreelancerReasonFromProfile(profile)
    const { error } = await supabase.from('freelancer_requests').insert({
      user_id: user.id,
      reason,
      status: 'pending',
    })
    if (error) return { ok: false, error: 'submit_failed' }

    const admin = createAdminClient()
    const { data: admins } = await admin.from('users').select('id').eq('role', 'admin')
    if (admins?.length) {
      after(() =>
        createNotifications(
          admins.map((a) => ({
            userId: a.id,
            title: 'New freelancer request',
            titleAr: 'طلب مستقل جديد',
            body: `${fullName} submitted a freelancer application.`,
            bodyAr: `قدّم ${fullName} طلب انضمام كمستقل.`,
            type: buildNotificationType(NotificationKind.freelancerRequest),
          }))
        )
      )
    }
  }

  await markRoleRequestMeta(user.id, {
    role_request_submitted: true,
    role_request_declined: false,
  })

  revalidatePath(`/${locale}/dashboard`)
  revalidatePath(`/${locale}/dashboard`)
  return { ok: true }
}

export async function declineOnboardingRoleRequest(locale: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  await markRoleRequestMeta(user.id, {
    role_request_declined: true,
    role_request_submitted: false,
  })

  revalidatePath(`/${locale}/dashboard`)
  return { ok: true }
}
