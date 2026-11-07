'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { saveNotificationPreferences } from '@/lib/notifications/page-actions'
import type { NotificationPreferences } from '@/lib/push/notification-preferences'

interface NotificationPreferencesCardProps {
  locale: string
  initial: NotificationPreferences
}

export default function NotificationPreferencesCard({
  locale,
  initial,
}: NotificationPreferencesCardProps) {
  const t = useTranslations('notifications.preferences')
  const [prefs, setPrefs] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const update = (patch: Partial<NotificationPreferences>) => {
    const previous = prefs
    const next = { ...prefs, ...patch }
    setPrefs(next)
    startTransition(async () => {
      const result = await saveNotificationPreferences(locale, patch)
      if (result.error) {
        setPrefs(previous)
        toast.error(t('save_error'))
      }
    })
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { key: 'push_enabled' as const, label: t('push_enabled') },
          { key: 'push_orders' as const, label: t('push_orders') },
          { key: 'push_courses' as const, label: t('push_courses') },
          { key: 'push_account' as const, label: t('push_account') },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4">
            <Label htmlFor={item.key} className="text-sm font-normal">
              {item.label}
            </Label>
            <Switch
              id={item.key}
              checked={prefs[item.key]}
              disabled={isPending || (item.key !== 'push_enabled' && !prefs.push_enabled)}
              onCheckedChange={(checked) => {
                if (item.key === 'push_enabled' && !checked) {
                  update({
                    push_enabled: false,
                    push_orders: false,
                    push_courses: false,
                    push_account: false,
                  })
                  return
                }
                if (item.key === 'push_enabled' && checked) {
                  update({
                    push_enabled: true,
                    push_orders: true,
                    push_courses: true,
                    push_account: true,
                  })
                  return
                }
                update({ [item.key]: checked })
              }}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
