'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import ChatMessageBubble from '@/components/chat/ChatMessageBubble'
import { createClient } from '@/lib/supabase/client'
import { getBrowserAuthUser } from '@/lib/supabase/safe-browser-auth'
import { sanitizeHistory } from '@/lib/chat/history'
import type { ChatMessage, ChatUserRole } from '@/types/chat'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'eduwork_chat_history'
const MAX_HISTORY = 20

// Report BS-51: the starter questions differ by role so they match what each
// user actually does on the platform.
const QUICK_PROMPTS_BY_ROLE: Record<string, string[]> = {
  student: ['quick_enroll', 'quick_cv', 'quick_jobs', 'quick_payment'],
  company: ['quick_post_job', 'quick_find_candidates', 'quick_subscription', 'quick_company_profile'],
  freelancer: ['quick_add_service', 'quick_orders', 'quick_marketplace', 'quick_freelancer_profile'],
  instructor: ['quick_create_course', 'quick_earnings', 'quick_students', 'quick_instructor_ai'],
  admin: ['quick_enroll', 'quick_jobs', 'quick_payment', 'quick_post_job'],
}

function quickPromptKeysForRole(role: string | null): string[] {
  return QUICK_PROMPTS_BY_ROLE[role ?? 'student'] ?? QUICK_PROMPTS_BY_ROLE.student
}

function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return sanitizeHistory(JSON.parse(raw))
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)))
  } catch {
    /* ignore quota errors */
  }
}

export default function PlatformChatbot() {
  const t = useTranslations('chat')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<ChatUserRole>(null)
  const [roleLoaded, setRoleLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages(loadHistory())
  }, [])

  useEffect(() => {
    const supabase = createClient()
    void getBrowserAuthUser().then(async (user) => {
      if (!user) {
        setUserRole(null)
        setRoleLoaded(true)
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      const role = profile?.role
      if (
        role === 'student' ||
        role === 'instructor' ||
        role === 'admin' ||
        role === 'company' ||
        role === 'freelancer'
      ) {
        setUserRole(role)
      } else {
        setUserRole('student')
      }
      setRoleLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [open, messages, loading])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      const userMessage: ChatMessage = { role: 'user', content: trimmed }
      const nextMessages = sanitizeHistory([...messages, userMessage])
      setMessages(nextMessages)
      saveHistory(nextMessages)
      setInput('')
      setLoading(true)

      try {
        const res = await fetch('/api/chat/general', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages,
            pageContext: pathname,
            userRole,
          }),
        })

        const data = (await res.json()) as { reply?: string; message?: string }

        let reply: string
        if (res.status === 401) {
          reply = data.message ?? t('error_fallback')
        } else if (res.status === 429) {
          reply = data.message ?? t('rate_limited')
        } else if (res.status === 400 && data.message) {
          reply = data.message
        } else if (res.status === 503 || res.status >= 500) {
          reply = t('error_unavailable')
        } else if (data.reply) {
          reply = data.reply
        } else if (res.status === 403) {
          reply = data.message ?? t('error_forbidden')
        } else {
          reply = t('error_fallback')
        }

        const withReply = [...nextMessages, { role: 'assistant' as const, content: reply }].slice(
          -MAX_HISTORY
        )
        setMessages(withReply)
        saveHistory(withReply)
      } catch {
        // Network-level failure (offline, or the server restarting mid-request).
        const withError = [
          ...nextMessages,
          { role: 'assistant' as const, content: t('error_network') },
        ].slice(-MAX_HISTORY)
        setMessages(withError)
        saveHistory(withError)
      } finally {
        setLoading(false)
      }
    },
    [loading, messages, pathname, t, userRole]
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
    sessionStorage.removeItem(STORAGE_KEY)
  }

  const hideOnCoursePages =
    pathname.includes('/learn/') || pathname.includes('/courses/')

  const hideOnDashboardOrAdmin =
    pathname.includes('/dashboard') || pathname.includes('/admin')

  if (hideOnCoursePages || hideOnDashboardOrAdmin) {
    return null
  }

  // Report BS-51: every signed-in role sees the assistant, each with its own
  // starter questions.
  if (!roleLoaded || !userRole) {
    return null
  }

  return (
    <>
      {/* Chat panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl transition-all duration-300',
          'bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] end-4 w-[min(100vw-2rem,380px)] sm:bottom-20',
          open
            ? 'h-[min(70vh,520px)] opacity-100 scale-100'
            : 'pointer-events-none h-0 opacity-0 scale-95'
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{t('title')}</p>
            <p className="text-xs opacity-80 truncate">{t('subtitle')}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-primary-foreground hover:bg-primary-foreground/15 shrink-0"
            onClick={() => setOpen(false)}
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center py-2">{t('welcome')}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickPromptKeysForRole(userRole).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void sendMessage(t(key))}
                    disabled={loading}
                    className="text-xs rounded-full border px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
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
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-3 shrink-0 space-y-2">
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
              className="min-h-[40px] max-h-24 resize-none flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              aria-label={t('send')}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* FAB toggle */}
      <Button
        type="button"
        size="icon-lg"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed z-40 h-14 w-14 rounded-full shadow-lg sm:z-50',
          'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] end-4 sm:bottom-4',
          open && 'bg-muted text-foreground hover:bg-muted/80'
        )}
        aria-label={open ? t('close') : t('open')}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </>
  )
}
