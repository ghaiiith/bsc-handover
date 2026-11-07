'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import NotificationItem from '@/components/shared/NotificationItem'
import EmptyState from '@/components/dashboard/ux/EmptyState'
import { loadMoreNotifications } from '@/lib/notifications/page-actions'
import { groupNotificationsByDate } from '@/lib/notifications/group-notifications'
import type { NotificationRecord } from '@/lib/notifications/types'
import { Bell } from 'lucide-react'

interface NotificationsPageClientProps {
  locale: string
  initialItems: NotificationRecord[]
  initialCursor: string | null
  initialHasMore: boolean
}

export default function NotificationsPageClient({
  locale,
  initialItems,
  initialCursor,
  initialHasMore,
}: NotificationsPageClientProps) {
  const t = useTranslations('notifications')
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isPending, startTransition] = useTransition()

  const groups = useMemo(() => groupNotificationsByDate(items), [items])

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
      <EmptyState
        icon={Bell}
        title={t('empty_title')}
        description={t('empty')}
        action={{
          href: `/${locale}/courses`,
          label: t('empty_action'),
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="mb-2 sticky top-0 z-10 bg-muted/20 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            {t(group.labelKey)}
          </h2>
          <ul className="space-y-2">
            {group.items.map((n) => (
              <li key={n.id}>
                <NotificationItem
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
        </section>
      ))}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={handleLoadMore} disabled={isPending}>
            {isPending ? t('loading_more') : t('load_more')}
          </Button>
        </div>
      )}
    </div>
  )
}
