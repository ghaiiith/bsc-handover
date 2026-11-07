import { redirect } from 'next/navigation'
import AppNavbar from '@/components/shared/AppNavbar'
import UserDashboardSidebar from '@/components/dashboard/UserDashboardSidebar'
import { getSessionProfile } from '@/lib/auth/profile'
import { getDashboardNavGroups } from '@/lib/dashboard/get-dashboard-nav'
import { userProfileToFormState } from '@/lib/profile/profile-merge'
import { calculateProfileScore } from '@/lib/profile/profile-score'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'

interface InstructorShellProps {
  locale: string
  children: React.ReactNode
}

export default async function InstructorShell({
  locale,
  children,
}: InstructorShellProps) {
  await requireInstructorAccess(locale)
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const { profile, authUser } = session
  const profileForm = userProfileToFormState(profile ?? { full_name: authUser.email ?? '' })
  const profileScore = calculateProfileScore(profileForm)
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
