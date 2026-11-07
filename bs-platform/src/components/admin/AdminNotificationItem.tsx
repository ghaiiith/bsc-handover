'use client'

import { useRouter } from 'next/navigation'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { markNotificationRead } from '@/lib/admin/notification-actions'
import { resolveNotificationLink } from '@/lib/notifications/resolve-link'

interface AdminNotificationItemProps {
  id: string
  title: string
  titleAr: string
  body: string
  bodyAr: string
  type: string
  isRead: boolean
  createdAt: string
  locale: string
}

export default function AdminNotificationItem({
  id,
  title,
  titleAr,
  body,
  bodyAr,
  type,
  isRead,
  createdAt,
  locale,
}: AdminNotificationItemProps) {
  const router = useRouter()
  const isAr = locale === 'ar'
  const link =
    resolveNotificationLink(type, locale, { isAdmin: true }) ??
    `/${locale}/admin/notifications`

  const handleClick = async () => {
    if (!isRead) {
      await markNotificationRead(id, locale)
    }
    router.push(link)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-start rounded-lg border bg-background p-4 hover:bg-muted/50 transition-colors ${
        !isRead ? 'border-primary/30 bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {!isRead && (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
        <div className={!isRead ? '' : 'ms-5'}>
          <p className="font-medium">{isAr ? titleAr : title}</p>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? bodyAr : body}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatRelativeTime(createdAt, locale)}
          </p>
        </div>
      </div>
    </button>
  )
}
