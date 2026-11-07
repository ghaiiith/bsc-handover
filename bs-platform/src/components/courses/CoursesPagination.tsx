'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CourseListParams } from '@/lib/courses/list-courses'

interface CoursesPaginationProps {
  locale: string
  params: CourseListParams
  page: number
  totalPages: number
}

function buildPageUrl(locale: string, params: CourseListParams, page: number): string {
  const sp = new URLSearchParams()

  if (params.q) sp.set('q', params.q)
  if (params.category) sp.set('category', params.category)
  if (params.level) sp.set('level', params.level)
  if (params.price && params.price !== 'all') sp.set('price', params.price)
  if (params.language) sp.set('language', params.language)
  if (params.sort && params.sort !== 'newest') sp.set('sort', params.sort)
  if (page > 1) sp.set('page', String(page))

  const qs = sp.toString()
  return `/${locale}/courses${qs ? `?${qs}` : ''}`
}

export default function CoursesPagination({
  locale,
  params,
  page,
  totalPages,
}: CoursesPaginationProps) {
  const t = useTranslations('courses')

  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  )

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      {page > 1 ? (
        <Link
          href={buildPageUrl(locale, params, page - 1)}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          {t('previous')}
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t('previous')}
        </Button>
      )}

      {pages.map((p, index) => {
        const prev = pages[index - 1]
        const showEllipsis = prev !== undefined && p - prev > 1

        return (
          <span key={p} className="flex items-center gap-2">
            {showEllipsis && <span className="text-muted-foreground">…</span>}
            <Link
              href={buildPageUrl(locale, params, p)}
              className={cn(
                buttonVariants({
                  variant: p === page ? 'default' : 'outline',
                  size: 'sm',
                }),
                'min-w-8'
              )}
            >
              {p}
            </Link>
          </span>
        )
      })}

      {page < totalPages ? (
        <Link
          href={buildPageUrl(locale, params, page + 1)}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          {t('next')}
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t('next')}
        </Button>
      )}
    </div>
  )
}
