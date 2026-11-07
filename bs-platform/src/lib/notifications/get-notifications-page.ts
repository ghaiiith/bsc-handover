import { createClient } from '@/lib/supabase/server'
import type { NotificationRecord } from '@/lib/notifications/types'

const PAGE_SIZE = 20

export interface NotificationsPageResult {
  items: NotificationRecord[]
  nextCursor: string | null
  hasMore: boolean
}

export async function getNotificationsPage(
  userId: string,
  cursor?: string | null,
  limit = PAGE_SIZE
): Promise<NotificationsPageResult> {
  const supabase = await createClient()

  let query = supabase
    .from('notifications')
    .select('id, title, title_ar, body, body_ar, type, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query
  if (error) {
    console.error('[notifications] Page fetch failed:', error.message)
    return { items: [], nextCursor: null, hasMore: false }
  }

  const rows = (data ?? []) as NotificationRecord[]
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1]?.created_at ?? null : null

  return { items, nextCursor, hasMore }
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  return count ?? 0
}
