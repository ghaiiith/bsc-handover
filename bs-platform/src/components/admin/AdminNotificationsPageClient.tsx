'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import AdminNotificationItem from '@/components/admin/AdminNotificationItem'
import { loadMoreNotifications } from '@/lib/notifications/page-actions'
import type { NotificationRecord } from '@/lib/notifications/types'

interface AdminNotificationsPageClientProps {
  locale: string
  initialItems: NotificationRecord[]
  initialCursor: string | null
  initialHasMore: boolean
}

export default function AdminNotificationsPageClient({
  locale,
  initialItems,
  initialCursor,
  initialHasMore,
}: AdminNotificationsPageClientProps) {
  const t = useTranslations('notifications')
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isPending, startTransition] = useTransition()

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadMoreNotifications(locale, cursor)
      if (!('success' in result) || !result.success) return
      setItems((prev) => [...prev, ...result.items])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    })
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        {t('empty')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <AdminNotificationItem
              id={n.id}
              title={n.title}
              titleAr={n.title_ar}
              body={n.body}
              bodyAr={n.body_ar}
              type={n.type}
              isRead={n.is_read}
              createdAt={n.created_at}
              locale={locale}
            />
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={isPending}>
            {isPending ? t('loading_more') : t('load_more')}
          </Button>
        </div>
      )}
    </div>
  )
}
