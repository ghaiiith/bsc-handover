'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Send, Sparkles, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CVFormData } from '@/types/cv'

interface QuotaState {
  limit: number
  remaining: number
  resetsAt: string
}

interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
  /** Sections the assistant changed, for the "what changed" line. */
  changed?: string[]
}

interface CvChatPanelProps {
  form: CVFormData
  onApply: (next: CVFormData) => void
}

/** Top-level sections that differ between two CV states. */
function diffSections(a: CVFormData, b: CVFormData): string[] {
  const ra = (a ?? {}) as unknown as Record<string, unknown>
  const rb = (b ?? {}) as unknown as Record<string, unknown>
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)])
  const changed: string[] = []
  for (const k of keys) {
    if (JSON.stringify(ra[k] ?? null) !== JSON.stringify(rb[k] ?? null)) changed.push(k)
  }
  return changed
}

/**
 * Report BS-33: chat panel that edits the CV through the AI `/edit` endpoint.
 * Every applied change is snapshotted so the user can undo it.
 */
export default function CvChatPanel({ form, onApply }: CvChatPanelProps) {
  const t = useTranslations('cv_chat')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [quota, setQuota] = useState<QuotaState | null>(null)
  const [undoStack, setUndoStack] = useState<CVFormData[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void fetch('/api/cv/chat-edit')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { quota?: QuotaState } | null) => {
        if (d?.quota) setQuota(d.quota)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns.length])

  const send = async () => {
    const instruction = input.trim()
    if (!instruction || sending) return
    setSending(true)
    setInput('')
    setTurns((p) => [...p, { role: 'user', text: instruction }])

    try {
      const res = await fetch('/api/cv/chat-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction, formData: form }),
      })
      const data = (await res.json()) as {
        formData?: CVFormData
        quota?: QuotaState
        error?: string
      }
      if (data.quota) setQuota(data.quota)

      if (res.status === 429) {
        setTurns((p) => [...p, { role: 'assistant', text: t('limit_reached') }])
        toast.error(t('limit_reached'))
        return
      }
      // Report BS-49: feature gated behind Pro — prompt to upgrade, not a silent fail.
      if (res.status === 402) {
        setTurns((p) => [...p, { role: 'assistant', text: t('pro_required') }])
        toast.error(t('pro_required'))
        return
      }
      if (!res.ok || !data.formData) {
        setTurns((p) => [...p, { role: 'assistant', text: t('error') }])
        return
      }

      const changed = diffSections(form, data.formData)
      setUndoStack((p) => [...p, form])
      onApply(data.formData)
      setTurns((p) => [
        ...p,
        {
          role: 'assistant',
          text: changed.length ? t('applied') : t('no_change'),
          changed,
        },
      ])
    } catch {
      setTurns((p) => [...p, { role: 'assistant', text: t('error') }])
    } finally {
      setSending(false)
    }
  }

  const undo = () => {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setUndoStack((p) => p.slice(0, -1))
    onApply(prev)
    toast.success(t('undone'))
  }

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          {t('title')}
        </span>
        <div className="flex items-center gap-2">
          {quota ? (
            <span className="num-en text-xs text-muted-foreground">
              {t('remaining', { count: quota.remaining, limit: quota.limit })}
            </span>
          ) : null}
          {undoStack.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={undo} className="gap-1">
              <Undo2 className="size-3.5" />
              {t('undo')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {turns.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">{t('hint')}</p>
        )}
        {turns.map((turn, i) => (
          <div key={i} className={cn('flex', turn.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                turn.role === 'user'
                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                  : 'rounded-bl-sm bg-muted'
              )}
            >
              <p className="whitespace-pre-wrap break-words">{turn.text}</p>
              {turn.changed && turn.changed.length > 0 && (
                <p className="mt-1 text-xs opacity-80">
                  {t('changed_sections')}: {turn.changed.join('، ')}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          rows={1}
          placeholder={t('placeholder')}
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="button" size="icon" onClick={() => void send()} disabled={sending || !input.trim()}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
