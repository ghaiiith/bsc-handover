'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

/**
 * The proxy redirects EVERY page except /account-suspended back to itself
 * while the account's `is_active` is false — including /login. A plain link
 * to /login therefore just bounces straight back here. Signing out first
 * clears the session cookie, so the follow-up navigation has no auth cookie
 * and the proxy treats it as an anonymous visitor, landing on a real /login.
 */
export default function AccountSuspendedActions({ locale }: { locale: string }) {
  const t = useTranslations('account_suspended')
  const [loading, setLoading] = useState(false)

  const handleBackToLogin = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      window.location.href = `/${locale}/login`
    }
  }

  return (
    <Button
      variant="outline"
      className="min-h-11 w-full"
      disabled={loading}
      onClick={() => void handleBackToLogin()}
    >
      {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
      {t('back_to_login')}
    </Button>
  )
}
