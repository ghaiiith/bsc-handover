'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Standalone language switch for pages that do not use the main Navbar (e.g. the
 * growth-guide landing page). Keeps the current path and swaps only the locale
 * segment, so the visitor stays on the page they were reading.
 */
export default function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()

  const switchLocale = () => {
    const next = locale === 'ar' ? 'en' : 'ar'
    const path = window.location.pathname.replace(`/${locale}`, '')
    router.push(`/${next}${path}${window.location.search}`)
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted',
        className
      )}
    >
      <Globe className="h-4 w-4" />
      {locale === 'ar' ? 'English' : 'العربية'}
    </button>
  )
}
