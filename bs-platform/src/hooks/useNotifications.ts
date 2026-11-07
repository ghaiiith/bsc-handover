'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NotificationRecord } from '@/lib/notifications/types'

const SELECT_FIELDS =
  'id, title, title_ar, body, body_ar, type, is_read, created_at'

interface UseNotificationsOptions {
  limit?: number
}

export function useNotifications(
  userId: string,
  options: UseNotificationsOptions = {}
) {
  const limit = options.limit ?? 10
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const limitRef = useRef(limit)
  // Lazy initializer: generated once per mount, never during render (keeps the
  // hook pure for the react-hooks/purity rule while staying stable across renders).
  const [channelId] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `n-${Math.random().toString(36).slice(2)}`
  )

  useEffect(() => {
    limitRef.current = limit
  }, [limit])

  const fetchUnreadCount = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('is_read', false)

    if (!error) setUnreadCount(count ?? 0)
  }, [])

  const fetchRecent = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select(SELECT_FIELDS)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(limitRef.current)

    if (!error) setNotifications((data ?? []) as NotificationRecord[])
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([fetchUnreadCount(userId), fetchRecent(userId)])
    setLoading(false)
  }, [userId, fetchUnreadCount, fetchRecent])

  const markReadLocally = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const markAllReadLocally = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  // Initial fetch when user changes
  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  // Realtime subscription — stable deps only; tear down fully before re-subscribing
  useEffect(() => {
    const supabase = createClient()
    const channelName = `notifications-live-${userId}-${channelId}`

    const existing = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`)
    if (existing) {
      void supabase.removeChannel(existing)
    }

    const channel = supabase.channel(channelName)

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRecord
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev
            return [row, ...prev].slice(0, limitRef.current)
          })
          setUnreadCount((c) => c + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRecord
          setNotifications((prev) =>
            prev.map((n) => (n.id === row.id ? row : n))
          )
          void fetchUnreadCount(userId)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, channelId, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markReadLocally,
    markAllReadLocally,
  }
}
