'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Send, Loader2, Sparkles, BookOpen, Briefcase, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LaChatResult } from '@/lib/ai/learning-assistant-server'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  courses?: LaChatResult['recommended_courses']
  jobs?: LaChatResult['recommended_jobs']
  actions?: LaChatResult['suggested_actions']
}

// Integration: the Computiq learning_assistant — recommends real courses & jobs.
export default function LearningAssistantPanel() {
  const t = useTranslations('assistant')
  const locale = useLocale() as 'ar' | 'en'
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || loading) return
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: message }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          locale,
          history: history.slice(-10),
          page: { path: window.location.pathname },
        }),
      })
      const data = (await res.json()) as LaChatResult & { error?: string }
      if (!res.ok || data.error) {
        setMessages((m) => [...m, { role: 'assistant', content: t('error') }])
        return
      }
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.answer,
          courses: data.recommended_courses,
          jobs: data.recommended_jobs,
          actions: data.suggested_actions,
        },
      ])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: t('error') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-2xl flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-1">
        {messages.length === 0 && (
          <div className="rounded-2xl border bg-card/60 p-6 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="font-medium">{t('welcome_title')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('welcome_subtitle')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[t('sample_1'), t('sample_2'), t('sample_3')].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'space-y-3'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground'
                  : 'max-w-[95%] whitespace-pre-line rounded-2xl border bg-card/60 px-4 py-3 text-sm'
              }
            >
              {m.content}
            </div>

            {m.role === 'assistant' && (m.courses?.length || m.jobs?.length) ? (
              <div className="grid gap-2">
                {m.courses?.map((c) => (
                  <Link
                    key={`c-${c.id}`}
                    href={c.url ?? `/${locale}/courses/${c.id}`}
                    className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm hover:border-primary/40"
                  >
                    <BookOpen className="h-4 w-4 shrink-0 text-brand-orange" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 font-medium">{c.title}</span>
                      {c.reasons?.[0] && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">{c.reasons[0]}</span>
                      )}
                    </span>
                    <span className="num-en shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                      {c.score}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                  </Link>
                ))}
                {m.jobs?.map((j) => (
                  <Link
                    key={`j-${j.id}`}
                    href={j.url ?? `/${locale}/jobs/${j.id}`}
                    className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm hover:border-primary/40"
                  >
                    <Briefcase className="h-4 w-4 shrink-0 text-brand-teal" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 font-medium">{j.title}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {[j.company, j.city].filter(Boolean).join(' · ')}
                        {j.match_percent != null ? ` · ${j.match_percent}% ${t('match')}` : ''}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                  </Link>
                ))}
              </div>
            ) : null}

            {m.actions && m.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {m.actions.map((a, k) => (
                  <Link
                    key={k}
                    href={a.href}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/40"
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('thinking')}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="mt-3 flex items-center gap-2 border-t pt-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('input_placeholder')}
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
