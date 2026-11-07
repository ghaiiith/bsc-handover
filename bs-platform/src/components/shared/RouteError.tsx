'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  locale?: string
}

export default function RouteError({ error, reset, locale = 'ar' }: RouteErrorProps) {
  const t = useTranslations('errors')

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[route-error]', error)
    }
  }, [error])

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{t('page_error_title')}</h1>
      <p className="text-muted-foreground max-w-md mb-8">{t('page_error_desc')}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t('retry')}
        </Button>
        <Link
          href={`/${locale}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
        >
          <Home className="h-4 w-4" />
          {t('back_home')}
        </Link>
      </div>
    </div>
  )
}
