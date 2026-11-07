'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, BellOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { isFirebaseClientConfigured } from '@/lib/push/firebase-config'
import { isPushSupported } from '@/lib/push/firebase-client'
import { getFcmErrorMessage, registerFcmToken } from '@/lib/push/register-fcm'

const PROMPT_DISMISS_KEY = 'eduwork_push_prompt_dismissed'

interface PushNotificationManagerProps {
  userId: string
  locale: string
}

export default function PushNotificationManager({
  userId,
  locale,
}: PushNotificationManagerProps) {
  const t = useTranslations('notifications.push')
  const [showPrompt, setShowPrompt] = useState(false)
  const [registering, setRegistering] = useState(false)
  const registeredRef = useRef(false)

  useEffect(() => {
    if (!userId || !isPushSupported() || !isFirebaseClientConfigured()) return

    const dismissed = localStorage.getItem(PROMPT_DISMISS_KEY) === '1'
    const permission = Notification.permission

    // Only show the opt-in prompt — do not auto-register on every page load.
    if (permission === 'default' && !dismissed) {
      const timer = window.setTimeout(() => setShowPrompt(true), 2500)
      return () => window.clearTimeout(timer)
    }
  }, [userId])

  const handleEnable = async () => {
    if (registeredRef.current) {
      setShowPrompt(false)
      return
    }

    setRegistering(true)
    try {
      await registerFcmToken(locale)
      registeredRef.current = true
      setShowPrompt(false)
      toast.success(t('enabled'))
    } catch (error) {
      console.error('[push] Enable failed:', error)
      toast.error(getFcmErrorMessage(error, t))
    } finally {
      setRegistering(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_DISMISS_KEY, '1')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 start-4 end-4 z-50 mx-auto max-w-md sm:start-auto sm:end-4">
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{t('prompt_title')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('prompt_body')}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" disabled={registering} onClick={() => void handleEnable()}>
                {t('enable')}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                <BellOff className="h-3.5 w-3.5 me-1" />
                {t('later')}
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label={t('later')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
