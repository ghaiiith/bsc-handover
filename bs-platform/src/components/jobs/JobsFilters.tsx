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
import { IRAQI_CITIES, IRAQI_CITIES_EN } from '@/lib/constants'
import type { JobListParams, JobSource } from '@/lib/jobs/list-jobs'
import type { JobSort } from '@/lib/jobs/job-utils'

interface JobsFiltersProps {
  locale: string
  params: JobListParams
}

export default function JobsFilters({ locale, params }: JobsFiltersProps) {
  const t = useTranslations('jobs')
  const router = useRouter()
  const isAr = locale === 'ar'

  const pushFilters = (next: Partial<JobListParams>) => {
    const merged = { ...params, ...next, page: 1 }
    const qs = new URLSearchParams()

    if (merged.q?.trim()) qs.set('q', merged.q.trim())
    if (merged.city) qs.set('city', merged.city)
    if (merged.jobType && merged.jobType !== 'all') qs.set('type', merged.jobType)
    if (merged.skill?.trim()) qs.set('skill', merged.skill.trim())
    if (merged.sort && merged.sort !== 'newest') qs.set('sort', merged.sort)
    if (merged.source && merged.source !== 'all') qs.set('source', merged.source)

    const query = qs.toString()
    router.push(`/${locale}/jobs${query ? `?${query}` : ''}`)
  }

  const filterContent = (
    <div className="space-y-5">
      {/* Channel imports outnumber platform posts thousands to one, so the
          source is the first thing a job seeker can narrow. */}
      <div className="space-y-2">
        <Label>{t('filter_source')}</Label>
        <Select
          value={params.source ?? 'all'}
          onValueChange={(v) => pushFilters({ source: (v ?? 'all') as JobSource })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('source_all')}</SelectItem>
            <SelectItem value="platform">{t('source_platform')}</SelectItem>
            <SelectItem value="external">{t('source_external')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          onBlur={(e) => {
            if (e.target.value !== (params.q ?? '')) {
              pushFilters({ q: e.target.value })
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('filter_city')}</Label>
        <Select
          value={params.city ?? 'all'}
          onValueChange={(v) =>
            pushFilters({ city: v === 'all' ? undefined : v ?? undefined })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_cities')}</SelectItem>
            {IRAQI_CITIES.map((cityAr, i) => (
              <SelectItem key={cityAr} value={cityAr}>
                {isAr ? cityAr : IRAQI_CITIES_EN[i]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('filter_type')}</Label>
        <Select
          value={params.jobType ?? 'all'}
          onValueChange={(v) =>
            pushFilters({
              jobType: (v ?? 'all') as JobListParams['jobType'],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('type_all')}</SelectItem>
            <SelectItem value="full_time">{t('full_time')}</SelectItem>
            <SelectItem value="part_time">{t('part_time')}</SelectItem>
            <SelectItem value="remote">{t('remote')}</SelectItem>
            <SelectItem value="internship">{t('internship')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('filter_skills')}</Label>
        <Input
          defaultValue={params.skill ?? ''}
          placeholder={t('filter_skills')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              pushFilters({ skill: (e.target as HTMLInputElement).value })
            }
          }}
          onBlur={(e) => {
            if (e.target.value !== (params.skill ?? '')) {
              pushFilters({ skill: e.target.value })
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('sort_by')}</Label>
        <Select
          value={params.sort ?? 'newest'}
          onValueChange={(v) => pushFilters({ sort: (v ?? 'newest') as JobSort })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('sort_newest')}</SelectItem>
            <SelectItem value="deadline">{t('sort_deadline')}</SelectItem>
            <SelectItem value="salary_desc">{t('sort_salary')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
