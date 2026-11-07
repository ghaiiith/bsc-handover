'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ServiceListParams } from '@/lib/services/list-services'

interface ServicesPaginationProps {
  locale: string
  params: ServiceListParams
  page: number
  totalPages: number
}

export default function ServicesPagination({
  locale,
  params,
  page,
  totalPages,
}: ServicesPaginationProps) {
  const t = useTranslations('services')

  if (totalPages <= 1) return null

  const buildHref = (targetPage: number) => {
    const qs = new URLSearchParams()
    if (params.q?.trim()) qs.set('q', params.q.trim())
    if (params.category) qs.set('category', params.category)
    if (params.priceMin != null) qs.set('priceMin', String(params.priceMin))
    if (params.priceMax != null) qs.set('priceMax', String(params.priceMax))
    if (params.delivery && params.delivery !== 'any')
      qs.set('delivery', params.delivery)
    if (params.sort && params.sort !== 'newest') qs.set('sort', params.sort)
    if (targetPage > 1) qs.set('page', String(targetPage))
    const query = qs.toString()
    return `/${locale}/services${query ? `?${query}` : ''}`
  }

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={cn(buttonVariants({ variant: 'outline' }))}>
          {t('previous')}
        </Link>
      ) : (
        <Button variant="outline" disabled>{t('previous')}</Button>
      )}
      <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={cn(buttonVariants({ variant: 'outline' }))}>
          {t('next')}
        </Link>
      ) : (
        <Button variant="outline" disabled>{t('next')}</Button>
      )}
    </div>
  )
}
