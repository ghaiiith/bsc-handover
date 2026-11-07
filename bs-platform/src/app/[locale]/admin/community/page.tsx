import { getLocale } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  fetchCommunityAdminStats,
  fetchCommunityMembersForAdmin,
} from '@/lib/community/get-community-data'
import { getCommunitySettings } from '@/lib/community/community-settings'
import AdminCommunityClient from '@/components/admin/AdminCommunityClient'

export default async function AdminCommunityPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  const [{ featuredUserIds, communityVisible }, members, stats] = await Promise.all([
    getCommunitySettings(),
    fetchCommunityMembersForAdmin(),
    fetchCommunityAdminStats(),
  ])

  const featuredSet = new Set(featuredUserIds)
  const featured = members.filter((m) => featuredSet.has(m.id))

  return (
    <AdminCommunityClient
      locale={locale}
      communityVisible={communityVisible}
      featured={featured}
      members={members}
      stats={stats}
    />
  )
}

export const metadata = { title: 'Community — Admin' }
