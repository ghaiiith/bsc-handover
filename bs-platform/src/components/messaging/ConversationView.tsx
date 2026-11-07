'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/messaging/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/lib/messaging/queries'
import type { UserRole } from '@/types'

interface ConversationViewProps {
  locale: string
  conversationId: string
  currentUserId: string
  other: {
    id: string
    full_name: string | null
    full_name_ar: string | null
    avatar_url: string | null
    role: UserRole
  }
  initialMessages: MessageRow[]
}

export default function ConversationView({
  locale,
  conversationId,
  currentUserId,
  other,
  initialMessages,
}: ConversationViewProps) {
  const t = useTranslations('messaging')
  const isAr = locale === 'ar'
  const Back = isAr ? ArrowRight : ArrowLeft
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const name = (isAr ? other.full_name_ar : other.full_name) || other.full_name || t('user')

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  // Live updates: append messages inserted into this conversation by the other party.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as MessageRow
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId])

  const onSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    // Optimistic append
    const optimistic: MessageRow = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      body: trimmed,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages((prev) => [...prev, optimistic])
    setBody('')
    const res = await sendMessage(conversationId, trimmed, locale)
    setSending(false)
    if (res.error) {
      // roll back optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setBody(trimmed)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-2xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-3">
        <Link
          href={`/${locale}/dashboard/messages`}
          className="rounded-md p-1.5 hover:bg-muted"
          aria-label={t('back')}
        >
          <Back className="size-5" />
        </Link>
        <Avatar className="size-9">
          <AvatarImage src={other.avatar_url ?? ''} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold">{name}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('start_hint')}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm',
                  mine
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm bg-muted'
                )}
              >
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void onSend()
            }
          }}
          rows={1}
          placeholder={t('type_message')}
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="button" size="icon" onClick={() => void onSend()} disabled={sending || !body.trim()}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
