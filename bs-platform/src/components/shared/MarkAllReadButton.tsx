'use client'

import { Button } from '@/components/ui/button'
import { markAllUserNotificationsRead } from '@/lib/notifications/actions'
import { markAllNotificationsRead } from '@/lib/admin/notification-actions'
import { useRouter } from 'next/navigation'

interface MarkAllReadButtonProps {
  locale: string
  label: string
  variant?: 'user' | 'admin'
}

export function MarkAllReadButton({
  locale,
  label,
  variant = 'user',
}: MarkAllReadButtonProps) {
  const router = useRouter()

  const handleClick = async () => {
    if (variant === 'admin') {
      await markAllNotificationsRead(locale)
    } else {
      await markAllUserNotificationsRead(locale)
    }
    router.refresh()
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      {label}
    </Button>
  )
}
