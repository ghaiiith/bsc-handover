'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SERVICE_CATEGORIES } from '@/lib/constants'
import type { ServiceListParams } from '@/lib/services/list-services'
import type { DeliveryFilter, ServiceSort } from '@/lib/services/service-utils'

interface ServicesFiltersProps {
  locale: string
  params: ServiceListParams
}

export default function ServicesFilters({ locale, params }: ServicesFiltersProps) {
  const t = useTranslations('services')
  const router = useRouter()
  const isAr = locale === 'ar'

  const pushFilters = (next: Partial<ServiceListParams>) => {
    const merged = { ...params, ...next, page: 1 }
    const qs = new URLSearchParams()

    if (merged.q?.trim()) qs.set('q', merged.q.trim())
    if (merged.category) qs.set('category', merged.category)
    if (merged.priceMin != null) qs.set('priceMin', String(merged.priceMin))
    if (merged.priceMax != null) qs.set('priceMax', String(merged.priceMax))
    if (merged.delivery && merged.delivery !== 'any')
      qs.set('delivery', merged.delivery)
    if (merged.sort && merged.sort !== 'newest') qs.set('sort', merged.sort)

    const query = qs.toString()
    router.push(`/${locale}/services${query ? `?${query}` : ''}`)
  }

  const content = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>{t('search_placeholder')}</Label>
        <Input
          defaultValue={params.q ?? ''}
          placeholder={t('search_placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              pushFilters({ q: (e.target as HTMLInputElement).value })
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('filter_category')}</Label>
        <Select
          value={params.category ?? 'all'}
          onValueChange={(v) =>
            pushFilters({ category: v === 'all' ? undefined : v ?? undefined })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('category_all')}</SelectItem>
            {SERVICE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {isAr ? cat.label : cat.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('filter_price')}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            placeholder={t('price_min')}
            defaultValue={params.priceMin ?? ''}
            onBlur={(e) =>
              pushFilters({
                priceMin: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <Input
            type="number"
            min={0}
            placeholder={t('price_max')}
            defaultValue={params.priceMax ?? ''}
            onBlur={(e) =>
              pushFilters({
                priceMax: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('filter_delivery')}</Label>
        <Select
          value={params.delivery ?? 'any'}
          onValueChange={(v) =>
            pushFilters({ delivery: (v ?? 'any') as DeliveryFilter })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('delivery_any')}</SelectItem>
            <SelectItem value="3">{t('delivery_3')}</SelectItem>
            <SelectItem value="7">{t('delivery_7')}</SelectItem>
            <SelectItem value="14">{t('delivery_14')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('sort_by')}</Label>
        <Select
          value={params.sort ?? 'newest'}
          onValueChange={(v) => pushFilters({ sort: (v ?? 'newest') as ServiceSort })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('sort_newest')}</SelectItem>
            <SelectItem value="price_asc">{t('sort_price_low')}</SelectItem>
            <SelectItem value="price_desc">{t('sort_price_high')}</SelectItem>
            <SelectItem value="best_rated">{t('sort_best_rated')}</SelectItem>
            <SelectItem value="most_orders">{t('sort_most_orders')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">{content}</div>
      <div className="lg:hidden">
        <Accordion>
          <AccordionItem value="filters">
            <AccordionTrigger>{t('filter')}</AccordionTrigger>
            <AccordionContent>{content}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  )
}
