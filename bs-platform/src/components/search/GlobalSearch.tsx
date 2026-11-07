'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Award,
  BookOpen,
  Briefcase,
  Search,
  Tag,
  User,
  Wrench,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { GlobalSearchResult, GlobalSearchResultType } from '@/lib/search/global-search'

const TYPE_ICONS: Record<GlobalSearchResultType, typeof BookOpen> = {
  course: BookOpen,
  job: Briefcase,
  service: Wrench,
  user: User,
  coupon: Tag,
  certificate: Award,
}

interface GlobalSearchProps {
  className?: string
  variant?: 'desktop' | 'drawer'
  onNavigate?: () => void
}

export default function GlobalSearch({
  className,
  variant = 'desktop',
  onNavigate,
}: GlobalSearchProps) {
  const t = useTranslations('search')
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [isPending, startTransition] = useTransition()

  const runSearch = useCallback(
    (q: string) => {
      if (q.trim().length < 2) {
        setResults([])
        return
      }
      startTransition(async () => {
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(q)}&locale=${locale}`
          )
          if (!res.ok) return
          const data = (await res.json()) as { results: GlobalSearchResult[] }
          setResults(data.results ?? [])
        } catch {
          setResults([])
        }
      })
    },
    [locale]
  )

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 250)
    return () => clearTimeout(timer)
  }, [query, runSearch])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery('')
    setResults([])
    onNavigate?.()
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          variant === 'desktop' &&
            'hidden lg:flex w-full items-center gap-2 rounded-md border bg-muted/50 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          variant === 'drawer' &&
            'flex w-full items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          className
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">{t('placeholder')}</span>
        {variant === 'desktop' && (
          <kbd className="ms-auto rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="sr-only">{t('title')}</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('input_placeholder')}
                className="border-0 shadow-none focus-visible:ring-0"
                autoFocus
              />
            </div>
          </DialogHeader>

          <div className="max-h-[min(60vh,400px)] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {t('hint')}
              </p>
            ) : isPending ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {t('searching')}
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {t('no_results')}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {results.map((result) => {
                  const Icon = TYPE_ICONS[result.type]
                  return (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(result.href)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-muted"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{result.title}</p>
                          {result.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                          {t(`type_${result.type}`)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
