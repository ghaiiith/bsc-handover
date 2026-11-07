'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Check, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import CandidateCard from '@/components/admin/CandidateCard'
import CandidatesPrivacyNotice, {
  CandidateProfileSlideover,
  usePrivacyNoticeDismissed,
} from '@/components/admin/CandidateProfileSlideover'
import { formatCount } from '@/lib/format-number'
import { getJobTypeLabel, jobTypeStyles } from '@/lib/jobs/job-utils'
import { IRAQI_CITIES, IRAQI_CITIES_EN } from '@/lib/constants'
import type { CandidateRankResponse, RankedCandidate } from '@/types/candidates'
import type { Job } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type PageState = 'empty' | 'loading' | 'results'

const LOADING_STEPS = ['loading_step1', 'loading_step2', 'loading_step3', 'loading_step4'] as const

interface JobCandidatesClientProps {
  locale: string
  job: Job
  eligibleCount: number
}

export default function JobCandidatesClient({
  locale,
  job,
  eligibleCount,
}: JobCandidatesClientProps) {
  const t = useTranslations('candidates')
  const tJobs = useTranslations('jobs')
  const isAr = locale === 'ar'

  const [pageState, setPageState] = useState<PageState>('empty')
  const [results, setResults] = useState<CandidateRankResponse | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [minScore, setMinScore] = useState(0)
  const [cityFilter, setCityFilter] = useState('')
  const [hasCvOnly, setHasCvOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'match' | 'experience' | 'location'>('match')
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null)

  const [privacyDismissed, dismissPrivacy] = usePrivacyNoticeDismissed()
  const abortRef = useRef<AbortController | null>(null)
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const jobTitle = isAr ? job.title_ar : job.title
  const cities = isAr ? IRAQI_CITIES : IRAQI_CITIES_EN

  const clearStepTimers = () => {
    stepTimersRef.current.forEach(clearTimeout)
    stepTimersRef.current = []
  }

  const runAnalysis = useCallback(async () => {
    clearStepTimers()
    setPageState('loading')
    setLoadingStep(0)

    stepTimersRef.current.push(setTimeout(() => setLoadingStep(1), 500))

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const fetchPromise = fetch('/api/admin/candidates/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, refresh: Boolean(results) }),
        signal: controller.signal,
      })

      const res = await fetchPromise
      setLoadingStep(2)

      stepTimersRef.current.push(
        setTimeout(() => setLoadingStep(3), 500),
        setTimeout(() => {
          setLoadingStep(4)
        }, 1000)
      )

      if (!res.ok) {
        throw new Error('rank_failed')
      }

      const data = (await res.json()) as CandidateRankResponse
      setResults(data)
      setPageState('results')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setPageState(results ? 'results' : 'empty')
        return
      }
      toast.error(t('analyze_error'))
      setPageState(results ? 'results' : 'empty')
    } finally {
      abortRef.current = null
    }
  }, [job.id, results, t])

  const cancelAnalysis = () => {
    abortRef.current?.abort()
    clearStepTimers()
    setPageState(results ? 'results' : 'empty')
  }

  useEffect(() => () => clearStepTimers(), [])

  const filteredCandidates = useMemo(() => {
    if (!results) return []
    let list = [...results.candidates]

    if (minScore > 0) {
      list = list.filter((c) => c.matchScore >= minScore)
    }
    if (cityFilter) {
      list = list.filter((c) => c.location?.toLowerCase().includes(cityFilter.toLowerCase()))
    }
    if (hasCvOnly) {
      list = list.filter((c) => c.hasCvProfile)
    }

    if (sortBy === 'experience') {
      list.sort((a, b) => b.yearsExperience - a.yearsExperience)
    } else if (sortBy === 'location' && job.city) {
      const jobCity = job.city.toLowerCase()
      list.sort((a, b) => {
        const aMatch = a.location?.toLowerCase().includes(jobCity) ? 1 : 0
        const bMatch = b.location?.toLowerCase().includes(jobCity) ? 1 : 0
        return bMatch - aMatch || b.matchScore - a.matchScore
      })
    } else {
      list.sort((a, b) => b.matchScore - a.matchScore)
    }

    return list
  }, [results, minScore, cityFilter, hasCvOnly, sortBy, job.city])

  const highestScore = results?.candidates[0]?.matchScore ?? 0

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      const input = document.createElement('input')
      input.value = email
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    toast.success(t('email_copied'))
  }

  const openDetailedAnalysis = (candidate: RankedCandidate) => {
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/jobs`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('back_to_jobs')}
        </Link>
      </div>

      {!privacyDismissed && <CandidatesPrivacyNotice onDismiss={dismissPrivacy} />}

      <div>
        <h1 className="text-2xl font-bold">{jobTitle}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline">{job.company_name}</Badge>
          <Badge variant="outline">{job.city}</Badge>
          <Badge className={cn(jobTypeStyles[job.job_type])} variant="secondary">
            {getJobTypeLabel(job.job_type, tJobs)}
          </Badge>
        </div>
        {results?.analyzedAt && (
          <p className="text-xs text-muted-foreground mt-2">
            {t('last_updated')}:{' '}
            <span className="num-en">
              {new Date(results.analyzedAt).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'en-US')}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Button
            type="button"
            className="gap-2 bg-orange-600 hover:bg-orange-700"
            onClick={() => void runAnalysis()}
            disabled={pageState === 'loading'}
          >
            <Sparkles className="h-4 w-4" />
            {results ? t('reanalyze') : t('find_button')}
          </Button>
          {!results && pageState === 'empty' && (
            <p className="text-sm text-muted-foreground mt-2">{t('empty_desc')}</p>
          )}
        </div>
      </div>

      {pageState === 'empty' && !results && (
        <div className="rounded-xl border bg-muted/20 py-16 px-6 text-center space-y-4">
          <Sparkles className="h-12 w-12 mx-auto text-orange-500 opacity-80" />
          <h2 className="text-lg font-semibold">{t('empty_title')}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('empty_desc')}</p>
          <p className="text-sm text-muted-foreground">
            {t('pool_preview', { count: formatCount(Math.min(eligibleCount, 100)) })}
          </p>
          {eligibleCount > 100 && (
            <p className="text-xs text-muted-foreground">{t('pool_limit_note')}</p>
          )}
          <Button
            type="button"
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 mt-2"
            onClick={() => void runAnalysis()}
          >
            {t('start_analysis')}
          </Button>
        </div>
      )}

      {pageState === 'loading' && (
        <div className="rounded-xl border p-8 space-y-6">
          <ul className="space-y-3">
            {LOADING_STEPS.map((key, i) => {
              const done = loadingStep > i
              const active = loadingStep === i
              return (
                <li key={key} className="flex items-center gap-3 text-sm">
                  {done ? (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500 shrink-0" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border shrink-0" />
                  )}
                  <span className={cn(done && 'text-muted-foreground')}>{t(key)}</span>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-muted-foreground">{t('analyzing_note')}</p>
          <Button type="button" variant="outline" onClick={cancelAnalysis}>
            {t('cancel_analysis')}
          </Button>
        </div>
      )}

      {pageState === 'results' && results && (
        <>
          {results.isFallback && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              {t('fallback_note')}
            </p>
          )}

          {results.totalEligible > 100 && (
            <p className="text-xs text-muted-foreground">{t('pool_limit_note')}</p>
          )}

          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {t('total_scanned', { count: formatCount(results.totalScanned) })}
            </span>
            <span>
              {t('found_count', { count: formatCount(filteredCandidates.length) })}
            </span>
            <span>
              {t('highest_score')}: <span className="num-en">{formatCount(highestScore)}%</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-4 items-end p-4 rounded-xl border bg-card">
            <div className="space-y-1 min-w-[160px]">
              <Label htmlFor="min-score" className="text-xs">
                {t('filter_min_score')}: <span className="num-en">{minScore}</span>
              </Label>
              <input
                id="min-score"
                type="range"
                min={0}
                max={100}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city-filter" className="text-xs">
                {t('filter_city')}
              </Label>
              <select
                id="city-filter"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">{t('filter_all_cities')}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="has-cv" checked={hasCvOnly} onCheckedChange={setHasCvOnly} />
              <Label htmlFor="has-cv" className="text-xs">
                {t('filter_has_cv')}
              </Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sort-by" className="text-xs">
                {t('sort_label')}
              </Label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="match">{t('sort_top_match')}</option>
                <option value="experience">{t('sort_most_exp')}</option>
                <option value="location">{t('sort_nearest')}</option>
              </select>
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="font-medium">{t('no_results')}</p>
              <p className="text-sm text-muted-foreground">{t('no_results_hint')}</p>
              <p className="text-xs text-muted-foreground num-en">
                {t('total_scanned', { count: formatCount(results.totalScanned) })}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.userId}
                  candidate={candidate}
                  onViewProfile={() => setSelectedCandidate(candidate)}
                  onDetailedAnalysis={() => openDetailedAnalysis(candidate)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CandidateProfileSlideover
        candidate={selectedCandidate}
        jobSkills={job.skills ?? []}
        onClose={() => setSelectedCandidate(null)}
        onDetailedAnalysis={() => {
          if (selectedCandidate) openDetailedAnalysis(selectedCandidate)
        }}
        onCopyEmail={() => {
          if (selectedCandidate) void copyEmail(selectedCandidate.email)
        }}
      />
    </div>
  )
}
