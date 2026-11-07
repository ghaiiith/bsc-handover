'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { JobListParams } from '@/lib/jobs/list-jobs'

interface JobsPaginationProps {
  locale: string
  params: JobListParams
  page: number
  totalPages: number
}

export default function JobsPagination({
  locale,
  params,
  page,
  totalPages,
}: JobsPaginationProps) {
  const t = useTranslations('jobs')

  if (totalPages <= 1) return null

  const buildHref = (targetPage: number) => {
    const qs = new URLSearchParams()
    if (params.q?.trim()) qs.set('q', params.q.trim())
    if (params.city) qs.set('city', params.city)
    if (params.jobType && params.jobType !== 'all') qs.set('type', params.jobType)
    if (params.skill?.trim()) qs.set('skill', params.skill.trim())
    if (params.sort && params.sort !== 'newest') qs.set('sort', params.sort)
    if (params.source && params.source !== 'all') qs.set('source', params.source)
    if (targetPage > 1) qs.set('page', String(targetPage))
    const query = qs.toString()
    return `/${locale}/jobs${query ? `?${query}` : ''}`
  }

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          {t('previous')}
        </Link>
      ) : (
        <Button variant="outline" disabled>
          {t('previous')}
        </Button>
      )}

      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          {t('next')}
        </Link>
      ) : (
        <Button variant="outline" disabled>
          {t('next')}
        </Button>
      )}
    </div>
  )
}
