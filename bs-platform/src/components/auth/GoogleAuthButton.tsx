'use client'

import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { getAppUrl } from '@/lib/seo/metadata'
import { cn } from '@/lib/utils'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

interface GoogleAuthButtonProps {
  locale: string
  mode: 'login' | 'register'
  className?: string
}

export default function GoogleAuthButton({ locale, mode, className }: GoogleAuthButtonProps) {
  const t = useTranslations('auth')

  const handleClick = async () => {
    const supabase = createClient()
    const appUrl = getAppUrl()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/auth/callback?locale=${locale}`,
      },
    })
  }

  const label = mode === 'login' ? t('google_login') : t('google_register')

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        'flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-white text-sm font-semibold text-[#374151] transition-all hover:bg-[#F8FAFC] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2',
        className
      )}
    >
      <GoogleIcon />
      <span>{label}</span>
    </button>
  )
}
