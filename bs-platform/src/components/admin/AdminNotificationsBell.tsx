'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { useNotifications } from '@/hooks/useNotifications'
import { markAllNotificationsRead, markNotificationRead } from '@/lib/admin/notification-actions'
import { resolveNotificationLink } from '@/lib/notifications/resolve-link'
import type { NotificationRecord } from '@/lib/notifications/types'

interface AdminNotificationsBellProps {
  locale: string
  adminUserId: string
}

export default function AdminNotificationsBell({
  locale,
  adminUserId,
}: AdminNotificationsBellProps) {
  const t = useTranslations('admin')
  const router = useRouter()
  const isAr = locale === 'ar'
  const {
    notifications,
    unreadCount,
    refresh,
    markReadLocally,
    markAllReadLocally,
  } = useNotifications(adminUserId)

  const handleMarkAllRead = async () => {
    markAllReadLocally()
    await markAllNotificationsRead(locale)
    await refresh()
  }

  const handleNotificationClick = async (n: NotificationRecord) => {
    if (!n.is_read) {
      markReadLocally(n.id)
      void markNotificationRead(n.id, locale)
    }
    const link = resolveNotificationLink(n.type, locale, { isAdmin: true })
    if (link) router.push(link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
        aria-label={t('notifications')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('notifications')}
            </span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead}>
                {t('mark_all_read')}
              </Button>
            )}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground text-center">
            {t('no_notifications')}
          </p>
        ) : (
          <DropdownMenuGroup>
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-1 py-2 cursor-pointer"
                onClick={() => void handleNotificationClick(n)}
              >
                <div className="flex w-full items-start gap-2">
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className={!n.is_read ? '' : 'ms-4'}>
                    <p className="text-sm font-medium line-clamp-1">
                      {isAr ? n.title_ar : n.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {isAr ? n.body_ar : n.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(n.created_at, locale)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/notifications`)}>
          {t('view_all_notifications')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
