import { redirect } from 'next/navigation'
import AppNavbar from '@/components/shared/AppNavbar'
import UserDashboardSidebar from '@/components/dashboard/UserDashboardSidebar'
import { getSessionProfile } from '@/lib/auth/profile'
import { profileFromAuthUser, mergeProfileWithClaims } from '@/lib/auth/profile-utils'
import { resolveAuthUser } from '@/lib/supabase/get-auth-user'
import { getDashboardNavGroups } from '@/lib/dashboard/get-dashboard-nav'
import { userProfileToFormState } from '@/lib/profile/profile-merge'
import { getProfileCompletion } from '@/lib/profile/completion'

interface DashboardShellProps {
  locale: string
  children: React.ReactNode
}

export default async function DashboardShell({
  locale,
  children,
}: DashboardShellProps) {
  let session = await getSessionProfile()

  if (!session) {
    const authUser = await resolveAuthUser()
    if (!authUser) {
      redirect(`/${locale}/login`)
    }
    session = {
      authUser,
      profile: mergeProfileWithClaims(profileFromAuthUser(authUser), authUser),
    }
  }

  const { profile, authUser } = session
  const profileForm = userProfileToFormState(profile ?? { full_name: authUser.email ?? '' })
  // BS-90: one calculation for both views — a company is scored on the company
  // checklist here, exactly as its profile page scores it.
  const profileScore = getProfileCompletion(
    (profile ?? null) as unknown as Record<string, unknown> | null,
    profile?.role
  )
  const navGroups = await getDashboardNavGroups({
    locale,
    profile,
    userId: authUser.id,
  })

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNavbar />
      <div className="container mx-auto max-w-6xl px-4 py-5 sm:py-8">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
          <aside className="hidden lg:block">
            <UserDashboardSidebar groups={navGroups} profileScore={profileScore} />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  )
}
