import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPersonalizedHomePath } from '@/lib/auth/personalized-home'
import ProfilePageClient from '@/components/profile/ProfilePageClient'
import CompanyProfileForm from '@/components/profile/CompanyProfileForm'
import { getSessionProfile } from '@/lib/auth/profile'
import { canAccessAiFeatures } from '@/lib/auth/role-capabilities'
import { getUserProfile } from '@/lib/profile/get-user-profile'
import { userProfileToFormState } from '@/lib/profile/profile-merge'
import { parsePreferences } from '@/lib/onboarding/preferences-utils'
import { getStudentCertificates } from '@/lib/certificates/get-certificates'
import { getCommunityCategories } from '@/lib/community/categories'

export default async function ProfilePage() {
  const locale = await getLocale()
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const profile = await getUserProfile(session.authUser.id)
  if (!profile) redirect(getPersonalizedHomePath(locale))

  // Report BS-47 / company profile spec: organisations get a full org profile,
  // not the student CV form.
  if (session.profile?.role === 'company') {
    const p = profile as unknown as Record<string, unknown>
    const str = (k: string) => (p[k] as string) ?? ''
    const arr = (k: string) => (Array.isArray(p[k]) ? (p[k] as string[]) : [])
    const num = (k: string) => (typeof p[k] === 'number' ? (p[k] as number) : null)
    return (
      <CompanyProfileForm
        locale={locale}
        userId={session.authUser.id}
        verificationStatus={str('company_verification_status') || 'unverified'}
        initial={{
          company_name: str('company_name'),
          company_name_ar: str('company_name_ar'),
          company_logo_url: str('company_logo_url'),
          company_type: str('company_type'),
          company_industry: str('company_industry'),
          company_size: str('company_size'),
          company_governorate: str('company_governorate'),
          company_city: str('company_city') || str('company_location'),
          company_description: str('company_description'),
          company_description_en: str('company_description_en'),
          company_tagline: str('company_tagline'),
          company_year_founded: num('company_year_founded'),
          company_website: str('company_website'),
          company_socials: (p.company_socials as Record<string, string>) ?? {},
          company_hr_name: str('company_hr_name'),
          company_hr_role: str('company_hr_role'),
          company_hr_email: str('company_hr_email'),
          company_hr_phone: str('company_hr_phone'),
          company_hr_preferred_contact: str('company_hr_preferred_contact'),
          company_hiring_roles: arr('company_hiring_roles'),
          company_hires_grads: typeof p.company_hires_grads === 'boolean' ? (p.company_hires_grads as boolean) : null,
          company_workplace_photos: arr('company_workplace_photos'),
          company_benefits: arr('company_benefits'),
          company_working_hours: str('company_working_hours'),
          company_culture_blurb: str('company_culture_blurb'),
          company_academy_seats: num('company_academy_seats'),
          company_academy_departments: arr('company_academy_departments'),
          company_academy_focus: arr('company_academy_focus'),
        }}
      />
    )
  }

  const initialForm = userProfileToFormState(profile)
  const preferences = parsePreferences(profile.preferences)
  const certificates = await getStudentCertificates(session.authUser.id)
  const canAccessAi = canAccessAiFeatures(session.profile?.role)
  const roleCategories = (await getCommunityCategories()).map((c) => ({
    value: c.value,
    label: c.label,
    labelEn: c.labelEn,
    emoji: c.emoji,
  }))

  return (
    <ProfilePageClient
      locale={locale}
      userId={session.authUser.id}
      initialForm={initialForm}
      preferences={preferences}
      portfolioSlug={profile.portfolio_slug}
      portfolioIsPublic={profile.portfolio_is_public !== false}
      uploadedCvUrl={profile.uploaded_cv_url}
      uploadedCvName={profile.uploaded_cv_name}
      roleCategories={roleCategories}
      certificates={certificates}
      canAccessAi={canAccessAi}
    />
  )
}
