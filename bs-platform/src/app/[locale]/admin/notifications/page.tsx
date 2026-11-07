import { getLocale, getTranslations } from 'next-intl/server'
import AdminNotificationsPageClient from '@/components/admin/AdminNotificationsPageClient'
import { MarkAllReadButton } from '@/components/shared/MarkAllReadButton'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getNotificationsPage } from '@/lib/notifications/get-notifications-page'

export default async function AdminNotificationsPage() {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  const { userId } = await requireAdminAccess(locale)

  const { items, nextCursor, hasMore } = await getNotificationsPage(userId)

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-end">
        <MarkAllReadButton
          locale={locale}
          label={t('mark_all_read')}
          variant="admin"
        />
      </div>

      <AdminNotificationsPageClient
        locale={locale}
        initialItems={items}
        initialCursor={nextCursor}
        initialHasMore={hasMore}
      />
    </div>
  )
}

export const metadata = { title: 'Notifications — Admin' }
