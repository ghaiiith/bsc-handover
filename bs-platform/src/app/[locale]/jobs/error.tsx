'use client'

import { useLocale } from 'next-intl'
import RouteError from '@/components/shared/RouteError'
import Navbar from '@/components/shared/Navbar'

export default function JobsError({
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
