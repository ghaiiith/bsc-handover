'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Bot, ChevronDown, ChevronUp, Loader2, Send, Sparkles } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import ChatMessageBubble from '@/components/chat/ChatMessageBubble'
import { createClient } from '@/lib/supabase/client'
import { getBrowserAuthUser } from '@/lib/supabase/safe-browser-auth'
import type { ChatMessage, ChatUserRole } from '@/types/chat'
import { cn } from '@/lib/utils'

const MAX_HISTORY = 20

const DETAIL_QUICK_KEYS = ['quick_overview', 'quick_curriculum', 'quick_instructor'] as const
const LESSON_QUICK_KEYS = ['quick_lesson_summary', 'quick_key_points', 'quick_next'] as const

interface CourseAssistantPanelProps {
  locale: string
  courseId: string
  courseTitle: string
  lessonId?: string
  variant?: 'embedded' | 'sidebar' | 'floating' | 'tab'
  isLoggedIn?: boolean
}

function storageKey(courseId: string): string {
  return `eduwork_course_assistant_${courseId}`
}

function loadHistory(courseId: string): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(storageKey(courseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : []
  } catch {
    return []
  }
}

function saveHistory(courseId: string, messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(storageKey(courseId), JSON.stringify(messages.slice(-MAX_HISTORY)))
  } catch {
    /* ignore */
  }
}

export default function CourseAssistantPanel({
  locale,
  courseId,
  courseTitle,
  lessonId,
  variant = 'embedded',
  isLoggedIn = true,
}: CourseAssistantPanelProps) {
  const t = useTranslations('courseAssistant')
  const [expanded, setExpanded] = useState(variant === 'embedded')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<ChatUserRole>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const quickKeys = lessonId ? LESSON_QUICK_KEYS : DETAIL_QUICK_KEYS
  const isSidebar = variant === 'sidebar'
  const isFloating = variant === 'floating'
  const isTab = variant === 'tab'

  useEffect(() => {
    if (isSidebar) {
      setExpanded(window.matchMedia('(min-width: 1024px)').matches)
    }
  }, [isSidebar])

  useEffect(() => {
    setMessages(loadHistory(courseId))
  }, [courseId])

  useEffect(() => {
    if (!isLoggedIn) return
    const supabase = createClient()
    void getBrowserAuthUser().then(async (user) => {
      if (!user) {
        setUserRole(null)
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      const role = profile?.role
      if (role === 'student' || role === 'instructor' || role === 'admin') {
        setUserRole(role)
      } else {
        setUserRole('student')
      }
    })
  }, [isLoggedIn])

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [expanded, messages, loading])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading || !isLoggedIn) return

      const userMessage: ChatMessage = { role: 'user', content: trimmed }
      const nextMessages = [...messages, userMessage].slice(-MAX_HISTORY)
      setMessages(nextMessages)
      saveHistory(courseId, nextMessages)
      setInput('')
      setLoading(true)

      if (isSidebar && !expanded) {
        setExpanded(true)
      }
      if (isFloating && !expanded) {
        setExpanded(true)
      }

      try {
        const res = await fetch('/api/chat/course-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages,
            courseId,
            lessonId,
            userRole,
          }),
        })

        const data = (await res.json()) as { reply?: string; message?: string }

        let reply: string
        if (res.status === 401) {
          reply = data.message ?? t('login_required')
        } else if (res.status === 403) {
          reply = data.message ?? t('enroll_required')
        } else if (res.status === 429) {
          reply = data.message ?? t('rate_limited')
        } else if (res.status === 400 && data.message) {
          reply = data.message
        } else if (data.reply) {
          reply = data.reply
        } else {
          reply = t('error_fallback')
        }

        const withReply = [...nextMessages, { role: 'assistant' as const, content: reply }].slice(
          -MAX_HISTORY
        )
        setMessages(withReply)
        saveHistory(courseId, withReply)
      } catch {
        const withError = [
          ...nextMessages,
          { role: 'assistant' as const, content: t('error_fallback') },
        ].slice(-MAX_HISTORY)
        setMessages(withError)
        saveHistory(courseId, withError)
      } finally {
        setLoading(false)
      }
    },
    [courseId, expanded, isFloating, isLoggedIn, isSidebar, lessonId, loading, messages, t, userRole]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([])
    sessionStorage.removeItem(storageKey(courseId))
  }

  const chatScrollClass = cn(
    'overflow-y-auto overscroll-contain space-y-3',
    isTab ? 'min-h-0 flex-1' : isSidebar ? 'max-h-[320px] min-h-[200px]' : 'max-h-[400px] min-h-[240px]'
  )

  const chatBody = (
    <>
      <div ref={scrollRef} className={chatScrollClass}>
        {!isLoggedIn ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">{t('login_prompt')}</p>
            <Link
              href={`/${locale}/login`}
              className={buttonVariants({ size: 'sm' })}
            >
              {t('login_button')}
            </Link>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground text-center">{t('welcome')}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void sendMessage(t(key))}
                      disabled={loading}
                      className="min-h-11 text-xs rounded-full border px-3 py-2 hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatMessageBubble key={`${msg.role}-${i}`} message={msg} />
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('typing')}
              </div>
            )}
          </>
        )}
      </div>

      {isLoggedIn && (
        <form onSubmit={handleSubmit} className={cn('border-t pt-3 space-y-2', isTab && 'shrink-0')}>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              {t('clear')}
            </button>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              disabled={loading}
              rows={1}
              maxLength={1000}
              className={cn(
                'resize-none flex-1 text-sm',
                isTab ? 'min-h-11 max-h-24' : 'min-h-[40px] max-h-20'
              )}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              aria-label={t('send')}
              className={cn(
                'shrink-0 bg-orange-600 hover:bg-orange-700',
                isTab && 'size-11'
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </>
  )

  if (isTab) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 max-lg:min-h-[18rem]">
        {chatBody}
      </div>
    )
  }

  if (isFloating) {
    return (
      <>
        {!expanded && (
          <Button
            type="button"
            size="lg"
            onClick={() => {
              setExpanded(true)
              setTimeout(() => inputRef.current?.focus(), 150)
            }}
            className="fixed bottom-6 end-6 z-50 h-14 gap-2 rounded-full px-5 shadow-lg bg-orange-600 hover:bg-orange-700"
            aria-label={t('open_mobile')}
          >
            <Bot className="h-5 w-5" />
            <span className="hidden sm:inline font-medium">{t('title')}</span>
          </Button>
        )}

        {expanded && (
          <div className="fixed bottom-6 end-6 z-50 flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b bg-orange-500/5 px-4 py-3 shrink-0">
              <div className="min-w-0">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  {t('title')}
                </p>
                <p className="text-xs text-muted-foreground truncate">{courseTitle}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpanded(false)}
                aria-label={t('collapse')}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 max-h-[min(70vh,520px)] overflow-hidden flex flex-col">
              {chatBody}
            </div>
          </div>
        )}
      </>
    )
  }

  if (isSidebar) {
    return (
      <>
        <Card className="edu-card shadow-none hidden lg:block">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-orange-500" />
                {t('title')}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? t('collapse') : t('expand')}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground truncate">{courseTitle}</p>
          </CardHeader>
          {expanded && <CardContent>{chatBody}</CardContent>}
        </Card>

        <div className="lg:hidden">
          {!expanded && (
            <Button
              type="button"
              className="fixed bottom-4 start-4 end-4 z-40 gap-2 bg-orange-600 hover:bg-orange-700 shadow-lg"
              onClick={() => {
                setExpanded(true)
                setTimeout(() => inputRef.current?.focus(), 150)
              }}
            >
              <Bot className="h-4 w-4" />
              {t('open_mobile')}
            </Button>
          )}

          {expanded && (
            <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-2xl border bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
                <div className="min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    {t('title')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{courseTitle}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setExpanded(false)}
                  aria-label={t('collapse')}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden p-4">{chatBody}</div>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-orange-500/5 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
          <Sparkles className="h-5 w-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground truncate">{courseTitle}</p>
        </div>
      </div>
      <div className="p-5">{chatBody}</div>
    </section>
  )
}
