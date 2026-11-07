'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResendCountdownButtonProps {
  onResend: () => Promise<void>
  initialSeconds?: number
  className?: string
}

export default function ResendCountdownButton({
  onResend,
  initialSeconds = 60,
  className,
}: ResendCountdownButtonProps) {
  const t = useTranslations('auth')
  const [seconds, setSeconds] = useState(initialSeconds)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (seconds <= 0) return

    const timer = setInterval(() => {
      setSeconds((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [seconds])

  const handleClick = async () => {
    if (seconds > 0 || loading) return
    setLoading(true)
    await onResend()
    setLoading(false)
    setSeconds(initialSeconds)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={seconds > 0 || loading}
      className={cn(
        'inline-flex items-center gap-2 text-sm font-semibold text-[#F97316] transition-opacity hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {seconds > 0 ? t('resend_countdown', { seconds }) : t('resend')}
    </button>
  )
}
