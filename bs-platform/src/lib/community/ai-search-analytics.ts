import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/** Record a successful community AI search (service role only). */
export async function logCommunityAiSearch(userId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('community_ai_search_logs').insert({ user_id: userId })
    if (error) {
      console.error('[community/ai-search] log insert failed:', error.message)
    }
  } catch (err) {
    console.error('[community/ai-search] log insert unexpected error:', err)
  }
}

/** Count AI searches in the last 30 days for the admin community dashboard. */
export async function getCommunityAiSearchCount30d(): Promise<number> {
  try {
    const admin = createAdminClient()
    const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()
    const { count, error } = await admin
      .from('community_ai_search_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    if (error) {
      console.error('[community/ai-search] count failed:', error.message)
      return 0
    }

    return count ?? 0
  } catch (err) {
    console.error('[community/ai-search] count unexpected error:', err)
    return 0
  }
}
