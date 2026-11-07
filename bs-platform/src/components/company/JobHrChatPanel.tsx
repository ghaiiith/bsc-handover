'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Bot, Loader2, Lock, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface Turn {
  role: 'user' | 'assistant'
  content: string
  shortlist?: Array<{
    name: string
    headline: string | null
    years: number
    matchedSkills: string[]
    matchScore: number | null
    source: 'applicant' | 'suggested'
    evidence: string[]
  }>
}

interface Props {
  jobId: string
  /** Round 9 (BS-109): the Free plan sees the panel locked, not hidden. */
  access: 'full' | 'feature_not_included' | 'limit_reached'
  allowance?: { used: number; limit: number | null }
}

/**
 * Round 9 (BS-108): ask HR questions about THIS job's candidates. The server
 * computes the shortlist deterministically and returns it alongside the
 * model's explanation, so what is rendered here is evidence, not prose.
 */
export default function JobHrChatPanel({ jobId, access, allowance }: Props) {
  const t = useTranslations('hr_chat')
  const locale = useLocale()
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState<number | null>(
    allowance?.limit === null || allowance?.limit === undefined
      ? null
      : Math.max(0, allowance.limit - allowance.used)
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, busy])

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const next: Turn[] = [...turns, { role: 'user', content: q }]
    setTurns(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch(`/api/company/jobs/${jobId}/hr-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })).slice(-20),
        }),
      })
      const data = (await res.json()) as {
        reply?: string
        shortlist?: Turn['shortlist']
        error?: string
        allowance?: { remaining: number | null }
      }
      if (!res.ok) {
        const msg =
          data.error === 'limit_reached'
            ? t('limit_reached')
            : data.error === 'feature_not_included'
              ? t('locked_hint')
              : t('error')
        setTurns([...next, { role: 'assistant', content: msg }])
        return
      }
      if (data.allowance && data.allowance.remaining !== undefined) setLeft(data.allowance.remaining)
      setTurns([
        ...next,
        { role: 'assistant', content: data.reply ?? '', shortlist: data.shortlist ?? [] },
      ])
    } catch {
      setTurns([...next, { role: 'assistant', content: t('error') }])
    } finally {
      setBusy(false)
    }
  }

  const header = (
    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <Bot className="h-4 w-4 text-primary" />
        {t('title')}
      </CardTitle>
      {access === 'full' && left !== null && (
        <span className="num-en text-xs text-muted-foreground">{t('remaining', { count: left })}</span>
      )}
    </CardHeader>
  )

  if (access !== 'full') {
    return (
      <Card>
        {header}
        <CardContent>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center text-sm">
            <Lock className="mx-auto mb-2 h-5 w-5 text-primary" />
            <p className="font-medium">
              {access === 'limit_reached' ? t('limit_reached') : t('locked_title')}
            </p>
            {access === 'feature_not_included' && (
              <>
                <p className="mt-1 text-muted-foreground">{t('locked_hint')}</p>
                <Link
                  href={`/${locale}/dashboard/subscription`}
                  className="mt-3 inline-block font-semibold text-primary hover:underline"
                >
                  {t('upgrade')} →
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const examples = [t('example_1'), t('example_2'), t('example_3')]

  return (
    <Card>
      {header}
      <CardContent className="space-y-3">
        <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto pe-1">
          {turns.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('intro')}</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => void ask(ex)}
                    className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[92%] rounded-xl px-3 py-2 text-sm',
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <p className="whitespace-pre-line">{m.content}</p>

                {m.shortlist && m.shortlist.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.shortlist.map((c, j) => (
                      <div key={j} className="rounded-lg border bg-background p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{c.name}</p>
                            {c.headline && (
                              <p className="truncate text-xs text-muted-foreground">{c.headline}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Badge variant="outline" className="text-[10px]">
                              {c.source === 'applicant' ? t('src_applicant') : t('src_suggested')}
                            </Badge>
                            {typeof c.matchScore === 'number' && (
                              <Badge className="num-en text-[10px]">{c.matchScore}%</Badge>
                            )}
                          </div>
                        </div>
                        <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                          {c.evidence.map((e, k) => (
                            <li key={k} className="flex gap-1">
                              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                              <span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('thinking')}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void ask(input)
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void ask(input)
              }
            }}
            placeholder={t('placeholder')}
            rows={1}
            className="min-h-[40px] resize-none"
            disabled={busy || left === 0}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim() || left === 0}>
            <Send className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
