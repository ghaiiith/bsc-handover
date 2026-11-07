'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookOpen } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CoursesEmptyStateProps {
  locale: string
  showClearFilters?: boolean
}

export default function CoursesEmptyState({
  locale,
  showClearFilters = false,
}: CoursesEmptyStateProps) {
  const t = useTranslations('courses')

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 px-6 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{t('no_courses')}</h3>
      {showClearFilters && (
        <Link
          href={`/${locale}/courses`}
          className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
        >
          {t('clear_filters')}
        </Link>
      )}
    </div>
  )
}
