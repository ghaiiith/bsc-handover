'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { postStudentLessonQuestion } from '@/lib/courses/lesson-qa-actions'
import type { LessonQaThreadWithMessages } from '@/types/lesson-qa'
import { toast } from 'sonner'

interface LessonQaPanelProps {
  locale: string
  courseId: string
  lessonId: string
  initialThread?: LessonQaThreadWithMessages | null
  highlightThreadId?: string
}

export default function LessonQaPanel({
  locale,
  courseId,
  lessonId,
  initialThread = null,
  highlightThreadId,
}: LessonQaPanelProps) {
  const t = useTranslations('courses.learn')
  const [thread, setThread] = useState<LessonQaThreadWithMessages | null>(initialThread)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const frame = requestAnimationFrame(() => {
      if (highlightThreadId && thread?.id === highlightThreadId) {
        const target = container.querySelector('[data-qa-highlight="true"]')
        if (target instanceof HTMLElement) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return
      }
      container.scrollTop = container.scrollHeight
    })

    return () => cancelAnimationFrame(frame)
  }, [thread?.messages.length, highlightThreadId, thread?.id])

  const handlePost = () => {
    const body = message.trim()
    if (!body) return

    startTransition(async () => {
      const result = await postStudentLessonQuestion(courseId, lessonId, body, locale)
      if (!result.success) {
        toast.error(t('qa_send_error'))
        return
      }
      if (result.thread) setThread(result.thread)
      setMessage('')
      toast.success(t('qa_sent'))
    })
  }

  const messages = thread?.messages ?? []
  const shouldHighlight = Boolean(highlightThreadId && thread?.id === highlightThreadId)

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-qa-highlight={shouldHighlight ? 'true' : undefined}
    >
      <p className="mb-3 shrink-0 text-xs text-muted-foreground">{t('qa_private_notice')}</p>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pe-1"
      >
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('no_discussions')}</p>
        ) : (
          messages.map((msg) => {
            const isStudent = msg.sender_role === 'student'
            return (
              <div
                key={msg.id}
                className={cn('flex', isStudent ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                    isStudent
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md bg-muted text-foreground'
                  )}
                >
                  {!isStudent && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {t('qa_instructor_label')}
                    </p>
                  )}
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-3 shrink-0 space-y-2 border-t pt-3">
        <Textarea
          rows={2}
          placeholder={t('ask_question')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handlePost()
            }
          }}
        />
        <Button size="sm" className="w-full gap-1.5" onClick={handlePost} disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {t('post')}
        </Button>
      </div>
    </div>
  )
}
