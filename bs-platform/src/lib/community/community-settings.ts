import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function parseFeaturedUserIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id) => typeof id === 'string' && UUID_RE.test(id))
  } catch {
    return []
  }
}

async function fetchCommunitySettings(): Promise<{
  featuredUserIds: string[]
  communityVisible: boolean
}> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_settings')
    .select('key, value')
    .in('key', ['community_featured_users', 'community_visible'])

  let featuredUserIds: string[] = []
  let communityVisible = true

  for (const row of data ?? []) {
    if (row.key === 'community_featured_users') {
      featuredUserIds = parseFeaturedUserIds(row.value as string)
    }
    if (row.key === 'community_visible') {
      communityVisible = row.value !== 'false'
    }
  }

  return { featuredUserIds, communityVisible }
}

export const getCommunitySettings = unstable_cache(
  fetchCommunitySettings,
  ['community-settings'],
  { revalidate: 60, tags: ['community-settings'] }
)

export async function isCommunityVisible(): Promise<boolean> {
  const settings = await getCommunitySettings()
  return settings.communityVisible
}
