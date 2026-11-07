import { getLocale } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminSettingsForm from '@/components/admin/AdminSettingsForm'
import AcademyTiersManager from '@/components/admin/AcademyTiersManager'
import { getAcademySeatTiers } from '@/lib/company/academy-tiers'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getPlatformSettings,
  parseFeaturedCourseIds,
} from '@/lib/admin/platform-settings'

export default async function AdminSettingsPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  const settings = await getPlatformSettings()
  const featuredIds = parseFeaturedCourseIds(settings.featured_course_ids)

  let featuredCourses: { id: string; title: string; title_ar: string; thumbnail_url?: string }[] = []
  if (featuredIds.length > 0) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('courses')
      .select('id, title, title_ar, thumbnail_url')
      .in('id', featuredIds)
      .eq('status', 'published')

    featuredCourses = (data ?? []).sort(
      (a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id)
    )
  }

  const seatTiers = await getAcademySeatTiers()

  return (
    <div className="space-y-8">
      <AdminSettingsForm
        locale={locale}
        settings={settings}
        featuredCourses={featuredCourses}
      />
      {/* Report BS-70/80: seat tiers configurable by the administrator. */}
      <AcademyTiersManager initial={seatTiers} />
    </div>
  )
}

export const metadata = { title: 'Settings — Admin' }
