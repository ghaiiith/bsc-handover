'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { postInstructorLessonReply } from '@/lib/courses/lesson-qa-actions'
import type { StudioLessonQaThreadRow } from '@/types/lesson-qa'
import { formatCount } from '@/lib/format-number'
import { toast } from 'sonner'

interface StudioLessonQaPanelProps {
  locale: string
  courseId: string
  threads: StudioLessonQaThreadRow[]
  openCount: number
  initialThreadId?: string
}

export default function StudioLessonQaPanel({
  locale,
  courseId,
  threads: initialThreads,
  openCount: initialOpenCount,
  initialThreadId,
}: StudioLessonQaPanelProps) {
  const t = useTranslations('studio.qa')
  const isAr = locale === 'ar'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [threads, setThreads] = useState(initialThreads)
  const [openCount, setOpenCount] = useState(initialOpenCount)
  const [filter, setFilter] = useState<'all' | 'open' | 'answered'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(
    initialThreadId ?? initialThreads[0]?.id ?? null
  )
  const [reply, setReply] = useState('')
  const [pending, startTransition] = useTransition()
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!initialThreadId) return
    setSelectedId(initialThreadId)
    const frame = requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [initialThreadId])

  const filtered = useMemo(() => {
    if (filter === 'all') return threads
    return threads.filter((thread) => thread.status === filter)
  }, [threads, filter])

  const selected = threads.find((thread) => thread.id === selectedId) ?? null

  const selectThread = (threadId: string) => {
    setSelectedId(threadId)
    const params = new URLSearchParams(searchParams.toString())
    params.set('thread', threadId)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleReply = () => {
    if (!selected) return
    const body = reply.trim()
    if (!body) return

    startTransition(async () => {
      const result = await postInstructorLessonReply(selected.id, courseId, body, locale)
      if (!result.success || !result.thread) {
        toast.error(t('reply_error'))
        return
      }

      const wasOpen = selected.status === 'open'
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selected.id
            ? {
                ...thread,
                status: 'answered',
                last_message_at: result.thread!.last_message_at,
                messages: result.thread!.messages,
                lastStudentMessage: thread.lastStudentMessage,
              }
            : thread
        )
      )
      if (wasOpen) setOpenCount((c) => Math.max(0, c - 1))
      setReply('')
      toast.success(t('reply_saved'))
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="edu-card flex flex-col shadow-none lg:col-span-2">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <p className="font-semibold">{t('inbox_title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('open_count', { count: formatCount(openCount) })}
            </p>
          </div>
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>

        <div className="flex gap-1 border-b p-2">
          {(['all', 'open', 'answered'] as const).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? 'default' : 'ghost'}
              className="h-7 text-xs"
              onClick={() => setFilter(key)}
            >
              {t(`filter_${key}`)}
            </Button>
          ))}
        </div>

        <div className="max-h-[520px] flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            filtered.map((thread) => {
              const studentName = isAr
                ? thread.student.full_name_ar ?? thread.student.full_name
                : thread.student.full_name
              const lessonTitle = isAr ? thread.lesson.title_ar : thread.lesson.title
              const preview = thread.lastStudentMessage?.content ?? ''
              const active = thread.id === selectedId

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => selectThread(thread.id)}
                  className={cn(
                    'w-full border-b px-4 py-3 text-start transition-colors hover:bg-muted/50',
                    active && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={thread.student.avatar_url ?? undefined} />
                      <AvatarFallback>{studentName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{studentName}</p>
                        {thread.status === 'open' && (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {t('status_open')}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{lessonTitle}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preview}</p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div ref={detailRef} className="edu-card shadow-none lg:col-span-3">
        {!selected ? (
          <p className="p-8 text-muted-foreground">{t('select_thread')}</p>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b p-5">
              <p className="text-lg font-semibold">
                {isAr ? selected.lesson.title_ar : selected.lesson.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('lesson_context', {
                  section: isAr ? selected.lesson.section_title_ar : selected.lesson.section_title,
                  type: selected.lesson.lesson_type ?? 'video',
                })}
              </p>
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">{t('student_label')}: </span>
                <span className="font-medium">
                  {isAr
                    ? selected.student.full_name_ar ?? selected.student.full_name
                    : selected.student.full_name}
                </span>
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5 max-h-[360px]">
              {selected.messages.map((msg) => {
                const isInstructor = msg.sender_role === 'instructor'
                return (
                  <div
                    key={msg.id}
                    className={cn('flex', isInstructor ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                        isInstructor
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md bg-muted'
                      )}
                    >
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                        {isInstructor ? t('you_label') : t('student_label')}
                      </p>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-2 border-t p-5">
              <Textarea
                rows={3}
                placeholder={t('reply_placeholder')}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                maxLength={4000}
              />
              <Button className="gap-2" onClick={handleReply} disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('reply')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
