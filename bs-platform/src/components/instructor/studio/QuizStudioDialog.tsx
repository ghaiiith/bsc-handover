'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { HelpCircle, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createCourseQuiz,
  getQuizForInstructor,
  updateCourseQuiz,
  type QuizQuestionInput,
} from '@/lib/courses/quiz-actions'
import { cn } from '@/lib/utils'

function emptyQuestion(): QuizQuestionInput {
  return { question_text: '', options: ['', '', ''], correct_index: 0 }
}

interface QuizStudioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locale: string
  courseId: string
  lessonId?: string
  lessonTitle?: string
  quizId?: string
  onSaved?: () => void
}

export default function QuizStudioDialog({
  open,
  onOpenChange,
  locale,
  courseId,
  lessonId,
  lessonTitle,
  quizId,
  onSaved,
}: QuizStudioDialogProps) {
  const t = useTranslations('studio.quizzes')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
  const [linkedLessonId, setLinkedLessonId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [questions, setQuestions] = useState<QuizQuestionInput[]>([emptyQuestion()])

  const resetForm = useCallback(() => {
    setEditingQuizId(null)
    setLinkedLessonId(null)
    setTitle(lessonTitle ?? '')
    setPassingScore(70)
    setQuestions([emptyQuestion()])
  }, [lessonTitle])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      const existing = await getQuizForInstructor(courseId, lessonId, quizId)
      if (cancelled) return

      if (existing) {
        setEditingQuizId(existing.id)
        setLinkedLessonId(existing.lesson_id)
        setTitle(existing.title)
        setPassingScore(existing.passing_score)
        setQuestions(
          existing.questions.length > 0 ? existing.questions : [emptyQuestion()]
        )
      } else {
        resetForm()
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, courseId, lessonId, quizId, resetForm])

  const handleSave = () => {
    if (!lessonId && !linkedLessonId) {
      toast.error(t('lesson_required'))
      return
    }

    if (!title.trim()) {
      toast.error(t('title_label'))
      return
    }

    const validQuestions = questions.filter((q) => q.question_text.trim())
    if (validQuestions.length === 0) {
      toast.error(t('questions_label'))
      return
    }

    startTransition(async () => {
      const payload = {
        title,
        passing_score: passingScore,
        lesson_id: lessonId ?? linkedLessonId,
        questions: validQuestions,
      }

      const result = editingQuizId
        ? await updateCourseQuiz(editingQuizId, courseId, locale, payload)
        : await createCourseQuiz(courseId, locale, payload)

      if (!result.success) {
        toast.error(editingQuizId ? t('update_error') : t('create_error'))
        return
      }

      toast.success(editingQuizId ? t('updated') : t('created'))
      onOpenChange(false)
      resetForm()
      onSaved?.()
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resetForm()
      }}
    >
      <DialogContent
        className={cn(
          'flex w-[min(96vw,48rem)] max-w-[min(96vw,48rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-[min(96vw,48rem)] max-h-[min(92vh,880px)]'
        )}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-start">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" />
            <DialogTitle className="text-lg">{t('studio_title')}</DialogTitle>
          </div>
          {lessonTitle && (
            <DialogDescription>
              {t('linked_lesson', { title: lessonTitle })}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('title_label')}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('title_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('passing_score')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="num-en max-w-[8rem]"
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value, 10) || 70)}
                />
              </div>

              <div className="space-y-3">
                <Label>{t('questions_label')}</Label>
                {questions.map((question, qi) => (
                  <div key={qi} className="space-y-2 rounded-lg border bg-muted/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground num-en">
                        {t('question_number', { n: qi + 1 })}
                      </span>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive gap-1"
                          onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <Input
                      value={question.question_text}
                      onChange={(e) => {
                        const next = [...questions]
                        next[qi] = { ...next[qi], question_text: e.target.value }
                        setQuestions(next)
                      }}
                      placeholder={t('question_placeholder')}
                    />
                    {question.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`quiz-correct-${qi}`}
                          checked={question.correct_index === oi}
                          onChange={() => {
                            const next = [...questions]
                            next[qi] = { ...next[qi], correct_index: oi }
                            setQuestions(next)
                          }}
                          className="accent-primary"
                          aria-label={t('correct_answer')}
                        />
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...questions]
                            const opts = [...next[qi].options]
                            opts[oi] = e.target.value
                            next[qi] = { ...next[qi], options: opts }
                            setQuestions(next)
                          }}
                          placeholder={`${t('option_placeholder')} ${oi + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setQuestions([...questions, emptyQuestion()])}
                >
                  <Plus className="size-3.5" />
                  {t('add_question')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/20 px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending || loading} className="gap-2">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {t('save_quiz')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
