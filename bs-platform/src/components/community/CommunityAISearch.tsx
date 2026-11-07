'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Loader2, Lock, Search, Sparkles, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import TalentCard from '@/components/community/TalentCard'
import type { CommunitySearchResult } from '@/types/community'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CommunityAISearchProps {
  isLoggedIn: boolean
  canViewPortfolios?: boolean
  viewerUserId?: string | null
  onResultsChange?: (results: CommunitySearchResult[] | null, query: string) => void
  embedded?: boolean
}

const EXAMPLES = [
  'search_example_1',
  'search_example_2',
  'search_example_3',
  'search_example_4',
] as const

export default function CommunityAISearch({
  isLoggedIn,
  canViewPortfolios = false,
  viewerUserId = null,
  onResultsChange,
  embedded = false,
}: CommunityAISearchProps) {
  const t = useTranslations('community')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [state, setState] = useState<'input' | 'searching' | 'results'>('input')
  const [results, setResults] = useState<CommunitySearchResult[]>([])
  const [activeQuery, setActiveQuery] = useState('')
  const [showLoginHint, setShowLoginHint] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const clearResults = () => {
    setState('input')
    setResults([])
    setActiveQuery('')
    onResultsChange?.(null, '')
  }

  useEffect(() => {
    onResultsChange?.(state === 'results' ? results : null, activeQuery)
  }, [state, results, activeQuery, onResultsChange])

  const runSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 5) return

    if (!isLoggedIn) {
      setShowLoginHint(true)
      return
    }

    setState('searching')
    setActiveQuery(trimmed)

    try {
      const res = await fetch('/api/community/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })
      const data = (await res.json()) as {
        results?: CommunitySearchResult[]
        error?: string
      }

      if (res.status === 429) {
        toast.error(t('ai_rate_limit'))
        setState('input')
        return
      }

      if (!res.ok) {
        toast.error(t('ai_no_results'))
        setState('input')
        return
      }

      setResults(data.results ?? [])
      setState('results')
    } catch {
      toast.error(t('ai_no_results'))
      setState('input')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runSearch(query)
  }

  if (state === 'searching') {
    return (
      <div
        className={cn(
          'rounded-2xl border bg-card/80 p-8 text-center shadow-sm backdrop-blur-sm md:p-10',
          embedded ? 'mx-auto max-w-4xl' : 'mx-auto max-w-3xl'
        )}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
        <p className="mt-5 text-sm font-medium text-foreground">{t('ai_searching')}</p>
        <div className="mx-auto mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-primary to-brand-green" />
        </div>
      </div>
    )
  }

  if (state === 'results') {
    return (
      <div className={cn('space-y-8', embedded ? 'mx-auto max-w-6xl' : 'mx-auto max-w-6xl')}>
        <div className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              {t('ai_results_title')}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t('ai_results_based_on')}: &ldquo;{activeQuery}&rdquo;
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearResults}
            className="gap-1.5 self-start border-primary/20 sm:self-center"
          >
            <X className="size-4" />
            {t('clear_ai_results')}
          </Button>
        </div>

        {results.length === 0 ? (
          <div className="edu-card rounded-2xl py-16 text-center shadow-none">
            <p className="text-sm text-muted-foreground">{t('ai_no_results')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((member) => (
              <TalentCard
                key={member.id}
                member={member}
                matchScore={member.match_score}
                canViewPortfolios={canViewPortfolios}
                viewerUserId={viewerUserId}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">{t('or_use_filters')}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', embedded ? 'mx-auto max-w-4xl' : 'mx-auto max-w-3xl')}>
      {!embedded && (
        <div className="mb-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" />
          <span>{t('ai_search_label')}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-primary/15 bg-card/90 p-2 shadow-sm backdrop-blur-md',
            'before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-primary/5 before:via-transparent before:to-brand-green/5',
            !isLoggedIn && 'opacity-95'
          )}
        >
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-background/60 px-3 py-2.5 sm:py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="size-4 text-primary" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={() => !isLoggedIn && setShowLoginHint(true)}
                disabled={!isLoggedIn}
                placeholder={t('ai_search_placeholder')}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-base"
              />
              {!isLoggedIn && <Lock className="size-4 shrink-0 text-muted-foreground" />}
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 sm:w-auto sm:shrink-0"
              disabled={!isLoggedIn || query.trim().length < 5}
            >
              <Search className="size-4" />
              {t('ai_search_btn')}
            </Button>
          </div>
        </div>

        {showLoginHint && !isLoggedIn && (
          <div className="absolute left-0 right-0 top-full z-20 mt-3 rounded-2xl border bg-card p-5 text-center shadow-xl sm:left-1/2 sm:w-[min(340px,92vw)] sm:-translate-x-1/2">
            <p className="text-sm text-muted-foreground">{t('ai_search_login_required')}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href={`/${locale}/login`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                {tNav('login')}
              </Link>
              <Link href={`/${locale}/register`} className={buttonVariants({ size: 'sm' })}>
                {tNav('register')}
              </Link>
            </div>
          </div>
        )}
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              const text = t(key)
              setQuery(text)
              if (isLoggedIn) void runSearch(text)
              else setShowLoginHint(true)
            }}
            className="rounded-full border border-border/80 bg-background/70 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            {t(key)}
          </button>
        ))}
      </div>

      {!embedded && (
        <p className="text-center text-xs text-muted-foreground">{t('or_use_filters')}</p>
      )}
    </div>
  )
}
