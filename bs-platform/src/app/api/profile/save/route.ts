import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { profileSaveSchema } from '@/lib/profile/profile-schemas'
import { calculateProfileScore, getMissingRequiredProfileFields } from '@/lib/profile/profile-score'
import { sanitizeProfileForSave } from '@/lib/profile/profile-sanitize'
import { userProfileToFormState } from '@/lib/profile/profile-merge'
import { getRecommendationsCacheTag } from '@/lib/recommendations/get-course-recommendations'
import type { ProfileFormState } from '@/types/profile'

export async function PUT(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = profileSaveSchema.safeParse(sanitizeProfileForSave(body as ProfileFormState))
  if (!parsed.success) {
    console.error('[profile/save] validation failed:', parsed.error.flatten())
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const input = parsed.data

  const { data: existing } = await supabase
    .from('users')
    .select('profile_completed_at')
    .eq('id', user.id)
    .single()

  const formForScore: ProfileFormState = {
    full_name: input.full_name,
    full_name_ar: input.full_name_ar ?? '',
    avatar_url: input.avatar_url ?? '',
    headline: input.headline ?? '',
    phone: input.phone ?? '',
    location: input.location ?? '',
    years_of_experience: input.years_of_experience ?? null,
    preferred_role: input.preferred_role ?? '',
    availability: input.availability ?? false,
      accepts_messages: input.accepts_messages ?? true,
    bio: input.bio ?? '',
    skills: input.skills ?? [],
    experience: input.experience ?? [],
    education: input.education ?? [],
    projects: input.projects ?? [],
    links: input.links ?? {},
  }

  const score = calculateProfileScore(formForScore)
  // Report BS-27: completeness is the mandatory-field set, not a 100% score
  // (which also demanded an avatar, bio and links). It is cleared again if the
  // profile later regresses below the requirement.
  const missingRequired = getMissingRequiredProfileFields(formForScore)
  const profileCompletedAt =
    missingRequired.length === 0
      ? existing?.profile_completed_at ?? new Date().toISOString()
      : null

  // authenticated role has no UPDATE grant on public.users (escalation lockdown) —
  // write via service role, scoped to the verified session user id.
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .update({
      full_name: input.full_name,
      full_name_ar: input.full_name_ar || null,
      avatar_url: input.avatar_url || null,
      headline: input.headline || null,
      phone: input.phone || null,
      location: input.location || null,
      years_of_experience: input.years_of_experience,
      preferred_role: input.preferred_role || null,
      // Report BS-61: the three-state value is authoritative; the boolean is
      // derived from it so all existing availability filters keep working.
      availability_status: input.availability_status ?? (input.availability ? 'open_to_work' : 'not_looking'),
      availability: input.availability_status
        ? input.availability_status !== 'not_looking'
        : input.availability ?? false,
      accepts_messages: input.accepts_messages ?? true,
      // Report BS-65: optional expected salary (does not affect completion).
      expected_salary_amount: input.expected_salary_amount ?? null,
      expected_salary_currency: input.expected_salary_currency ?? 'IQD',
      expected_salary_period: input.expected_salary_period ?? 'monthly',
      expected_salary_public: input.expected_salary_public ?? true,
      bio: input.bio || null,
      skills: input.skills ?? [],
      experience: input.experience ?? [],
      education: input.education ?? [],
      projects: input.projects ?? [],
      links: input.links ?? {},
      profile_completed_at: profileCompletedAt,
    })
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateTag(getRecommendationsCacheTag(user.id), 'max')
  // Report BS-83: availability / profile edits must take effect IMMEDIATELY.
  // The Community list is cached for 5 minutes and the employer candidate
  // suggestions for 15 — without busting them, a student who sets "not available
  // for work" keeps showing as available, which is exactly the reported defect.
  revalidateTag('community-members', 'max')
  revalidateTag('job-recommendations', 'max')

  try {
    const { data: slugRow } = await supabase
      .from('users')
      .select('portfolio_slug')
      .eq('id', user.id)
      .single()

    if (!slugRow?.portfolio_slug) {
      const { ensurePortfolioSlug } = await import('@/lib/portfolio/ensure-portfolio-slug')
      await ensurePortfolioSlug(user.id, input.full_name, input.full_name_ar)
    }
  } catch (slugError) {
    console.error('[profile/save] portfolio slug skipped:', slugError)
  }

  return NextResponse.json({
    user: data,
    form: userProfileToFormState(data),
    score,
  })
}
