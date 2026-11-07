'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export function useEmailAvailability(email: string, locale: string) {
  const t = useTranslations('auth')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setAvailable(null)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setChecking(false)
      return
    }

    setChecking(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-email?email=${encodeURIComponent(trimmed)}`
        )
        const data = (await res.json()) as { available?: boolean }
        setAvailable(data.available ?? true)
      } catch {
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 800)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [email])

  const hint = () => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) return null

    if (checking) {
      return (
        <p className="flex items-center gap-1.5 text-xs text-[#64748B]">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          {t('checking_email')}
        </p>
      )
    }

    if (available === true) {
      return (
        <p className="text-xs text-[#22C55E]">{t('email_available')}</p>
      )
    }

    if (available === false) {
      return (
        <p className="text-xs text-[#EF4444]">
          {t('email_taken')}{' '}
          <Link
            href={`/${locale}/login`}
            className="font-semibold text-[#F97316] hover:underline"
          >
            {t('login_btn')}
          </Link>
        </p>
      )
    }

    return null
  }

  return { checking, available, hint }
}
