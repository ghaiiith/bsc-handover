'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LearnMobileHeaderProps {
  locale: string
  courseId: string
  courseTitle: string
  lessonTitle?: string
}

export default function LearnMobileHeader({
  locale,
  courseId,
  courseTitle,
  lessonTitle,
}: LearnMobileHeaderProps) {
  const t = useTranslations('courses')
  const subtitle = lessonTitle?.trim() || courseTitle

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur supports-backdrop-filter:bg-background/80 lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
      <div className="flex min-h-11 items-center gap-2">
        <Link
          href={`/${locale}/courses/${courseId}`}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'h-11 shrink-0 gap-1.5 px-2.5 -ms-1'
          )}
          aria-label={t('back_to_course')}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          <span className="max-w-[7.5rem] truncate sm:max-w-none">{t('back_to_course')}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight text-foreground">
            {subtitle}
          </p>
          {lessonTitle ? (
            <p className="truncate text-xs text-muted-foreground">{courseTitle}</p>
          ) : null}
        </div>
      </div>
    </header>
  )
}
