import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationPreferencesCard from '@/components/notifications/NotificationPreferencesCard'
import NotificationsPageClient from '@/components/notifications/NotificationsPageClient'
import { MarkAllReadButton } from '@/components/shared/MarkAllReadButton'
import { getNotificationsPage } from '@/lib/notifications/get-notifications-page'
import { getNotificationPreferences } from '@/lib/push/notification-preferences'

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function NotificationsPage() {
  const locale = await getLocale()
  const t = await getTranslations('notifications')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const [{ items, nextCursor, hasMore }, preferences] = await Promise.all([
    getNotificationsPage(user.id),
    getNotificationPreferences(user.id),
  ])

  return (
    <>
      <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('page_title')}</h1>
          <MarkAllReadButton locale={locale} label={t('mark_all_read')} />
        </div>

        <NotificationPreferencesCard locale={locale} initial={preferences} />

        <NotificationsPageClient
          locale={locale}
          initialItems={items}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
        />
    </>
  )
}
