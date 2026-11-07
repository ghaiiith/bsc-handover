'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FileText } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CvBuilderBannerProps {
  locale: string
}

export default function CvBuilderBanner({ locale }: CvBuilderBannerProps) {
  const t = useTranslations('cv')

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-orange-500/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div className="flex gap-4">
        <div className="rounded-lg bg-primary/10 p-3 h-fit">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{t('profile_banner_title')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('profile_banner_desc')}</p>
        </div>
      </div>
      <Link
        href={`/${locale}/cv-builder`}
        className={cn(buttonVariants(), 'shrink-0')}
      >
        {t('profile_banner_cta')}
      </Link>
    </div>
  )
}
