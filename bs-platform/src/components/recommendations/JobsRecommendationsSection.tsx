'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  BadgeCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  MapPin,
  Radio,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getJobTypeLabel, jobTypeStyles } from '@/lib/jobs/job-utils'
import type { Job } from '@/types'

interface JobsRecommendationsSectionProps {
  locale: string
}

const COLLAPSED_KEY = 'bs_job_recs_collapsed'

interface RecResponse {
  jobs: Array<{ job: Job; reason: string; matchPercent?: number }>
  isFallback: boolean
}

// Mirrors CoursesRecommendationsSection so both listings open the same way.
export default function JobsRecommendationsSection({
  locale,
}: JobsRecommendationsSectionProps) {
  const t = useTranslations('recommendations')
  const tj = useTranslations('jobs')
  const [collapsed, setCollapsed] = useState(false)
  const [data, setData] = useState<RecResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === 'true')
    } catch {
      /* ignore */
    }
  }, [])

  const fetchRecs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/recommendations/jobs', { method: 'POST' })
      if (res.ok) setData((await res.json()) as RecResponse)
    } catch {
      /* leave the section empty rather than breaking the listing */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRecs()
  }, [fetchRecs])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next))
    } catch {
      /* ignore */
    }
  }

  // Nothing to suggest — stay out of the way instead of showing an empty box.
  if (!loading && !data?.jobs.length) return null

  return (
    <div className="mb-8 overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 p-4 transition-colors hover:bg-muted/30"
        onClick={toggleCollapsed}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('jobs_page_title')}
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="space-y-3 px-4 pb-4">
          {loading && <p className="text-sm text-muted-foreground">{t('loading_jobs')}</p>}

          {!loading && data?.jobs.length ? (
            <>
              <div className="flex snap-x gap-4 overflow-x-auto pb-2">
                {data.jobs.map(({ job, reason, matchPercent }) => (
                  <Link
                    key={job.id}
                    href={`/${locale}/jobs/${job.id}`}
                    className="group w-[260px] shrink-0 snap-start"
                  >
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={job.is_external ? 'outline' : 'secondary'}
                            className={cn(
                              'gap-1 text-[11px]',
                              !job.is_external && 'bg-primary/10 text-primary'
                            )}
                          >
                            {job.is_external ? (
                              <Radio className="h-3 w-3" />
                            ) : (
                              <BadgeCheck className="h-3 w-3" />
                            )}
                            {job.is_external
                              ? tj('source_external')
                              : tj('source_platform')}
                          </Badge>
                          {typeof matchPercent === 'number' && (
                            <span className="text-xs font-semibold text-primary">
                              {Math.round(matchPercent)}%
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-bold">{job.company_name}</p>
                          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
                            {(locale === 'ar' ? job.title_ar : job.title) || job.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="gap-1 text-[11px]">
                            <MapPin className="h-3 w-3" />
                            {job.city}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(jobTypeStyles[job.job_type], 'gap-1 text-[11px]')}
                          >
                            <Briefcase className="h-3 w-3" />
                            {getJobTypeLabel(job.job_type, tj)}
                          </Badge>
                        </div>

                        <p className="line-clamp-2 text-xs text-muted-foreground">{reason}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={toggleCollapsed}>
                {t('hide')}
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
