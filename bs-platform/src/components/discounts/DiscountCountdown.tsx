'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface DiscountCountdownProps {
  endsAt: string
  className?: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export default function DiscountCountdown({
  endsAt,
  className,
}: DiscountCountdownProps) {
  const t = useTranslations('discounts')
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      setRemaining(diff > 0 ? diff : 0)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (remaining === null || remaining <= 0) return null

  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const colorClass =
    remaining < 3_600_000
      ? 'text-red-600'
      : remaining < 86_400_000
        ? 'text-orange-600'
        : 'text-emerald-600'

  const parts: string[] = []
  if (days > 0) parts.push(`${days} ${t('days')}`)
  parts.push(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`)

  return (
    <p className={cn('text-sm font-medium', colorClass, className)}>
      ⏰ {t('expires_in')}: {parts.join(' ')}
    </p>
  )
}
