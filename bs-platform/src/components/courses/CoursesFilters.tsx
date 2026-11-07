'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useCourseCategories } from '@/components/categories/CourseCategoriesProvider'
import type { CourseListParams } from '@/lib/courses/list-courses'

interface CoursesFiltersProps {
  locale: string
  params: CourseListParams
}

function buildCoursesSearchParams(params: CourseListParams): URLSearchParams {
  const sp = new URLSearchParams()

  if (params.q) sp.set('q', params.q)
  if (params.category) sp.set('category', params.category)
  if (params.level) sp.set('level', params.level)
  if (params.price && params.price !== 'all') sp.set('price', params.price)
  if (params.language) sp.set('language', params.language)
  if (params.sort && params.sort !== 'newest') sp.set('sort', params.sort)
  if (params.page && params.page > 1) sp.set('page', String(params.page))

  return sp
}

export default function CoursesFilters({ locale, params }: CoursesFiltersProps) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const categories = useCourseCategories()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(params.q ?? '')

  const isAr = locale === 'ar'

  const navigate = useCallback(
    (next: CourseListParams) => {
      const sp = buildCoursesSearchParams({ ...next, page: 1 })
      const qs = sp.toString()
      startTransition(() => {
        router.push(`/${locale}/courses${qs ? `?${qs}` : ''}`)
      })
    },
    [locale, router]
  )

  const updateField = <K extends keyof CourseListParams>(key: K, value: CourseListParams[K]) => {
    navigate({ ...params, [key]: value || undefined })
  }

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    navigate({ ...params, q: search.trim() || undefined })
  }

  const handleClear = () => {
    setSearch('')
    startTransition(() => {
      router.push(`/${locale}/courses`)
    })
  }

  const filterContent = (
    <div className="space-y-5">
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_placeholder')}
          className="ps-9"
        />
      </form>

      <div className="space-y-2">
        <Label>{t('filter_category')}</Label>
        <Select
          value={params.category ?? 'all'}
          onValueChange={(value) =>
            updateField('category', value && value !== 'all' ? value : undefined)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon('all')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {isAr ? cat.label : cat.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('filter_level')}</Label>
        <Select
          value={params.level ?? 'all'}
          onValueChange={(value) =>
            updateField(
              'level',
              value === 'all' ? undefined : (value as CourseListParams['level'])
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon('all')}</SelectItem>
            <SelectItem value="beginner">{t('level_beginner')}</SelectItem>
            <SelectItem value="intermediate">{t('level_intermediate')}</SelectItem>
            <SelectItem value="advanced">{t('level_advanced')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('filter_price')}</Label>
        <Select
          value={params.price ?? 'all'}
          onValueChange={(value) =>
            updateField(
              'price',
              value === 'all' ? undefined : (value as CourseListParams['price'])
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('price_all')}</SelectItem>
            <SelectItem value="free">{t('price_free')}</SelectItem>
            <SelectItem value="paid">{t('price_paid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('filter_language')}</Label>
        <Select
          value={params.language ?? 'all'}
          onValueChange={(value) =>
            updateField('language', value && value !== 'all' ? value : undefined)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon('all')}</SelectItem>
            <SelectItem value="ar">{t('language_ar')}</SelectItem>
            <SelectItem value="en">{t('language_en')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('sort_by')}</Label>
        <Select
          value={params.sort ?? 'newest'}
          onValueChange={(value) =>
            updateField('sort', value as CourseListParams['sort'])
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('sort_newest')}</SelectItem>
            <SelectItem value="price_asc">{t('sort_price_low')}</SelectItem>
            <SelectItem value="price_desc">{t('sort_price_high')}</SelectItem>
            <SelectItem value="most_enrolled">{t('sort_most_enrolled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleClear}
        disabled={isPending}
      >
        {t('clear_filters')}
      </Button>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">{filterContent}</div>
      <div className="lg:hidden">
        <Accordion>
          <AccordionItem value="filters">
            <AccordionTrigger>{t('filter')}</AccordionTrigger>
            <AccordionContent>{filterContent}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  )
}
