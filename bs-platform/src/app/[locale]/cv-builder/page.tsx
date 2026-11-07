import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import AppNavbar from '@/components/shared/AppNavbar'
import CvBuilderDashboardClient from '@/components/cv/CvBuilderDashboardClient'
import { getSessionProfile } from '@/lib/auth/profile'
import { listCvProfiles } from '@/lib/cv/cv-data'
import { getUserProfile } from '@/lib/profile/get-user-profile'
import { userProfileToFormState } from '@/lib/profile/profile-merge'
import { calculateProfileScore } from '@/lib/profile/profile-score'

export default async function CvBuilderPage() {
  const locale = await getLocale()
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const profiles = await listCvProfiles(session.authUser.id)
  const userProfile = await getUserProfile(session.authUser.id)
  const profileScore = userProfile
    ? calculateProfileScore(userProfileToFormState(userProfile))
    : 0

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNavbar />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <CvBuilderDashboardClient
          locale={locale}
          profiles={profiles}
          profileScore={profileScore}
          portfolioSlug={userProfile?.portfolio_slug}
        />
      </div>
    </div>
  )
}
