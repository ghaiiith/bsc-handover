'use client'

import RouteError from '@/components/shared/RouteError'
import Navbar from '@/components/shared/Navbar'
import { useLocale } from 'next-intl'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useLocale()

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <RouteError error={error} reset={reset} locale={locale} />
    </div>
  )
}
