'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitQuizAttempt } from '@/lib/courses/submit-quiz-attempt'
import { useLessonPlayer } from '@/components/courses/LessonPlayerProvider'
import type { StudentQuizData } from '@/lib/courses/get-lesson-quiz'
import type { QuizAttemptReview } from '@/types/quiz'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LessonQuizPlayerProps {
  locale: string
  courseId: string
  lessonId: string
  quiz: StudentQuizData
  isAr: boolean
}

function buildAnswersFromReview(review: QuizAttemptReview): Record<string, number> {
  const answers: Record<string, number> = {}
  for (const [questionId, item] of Object.entries(review)) {
    if (item.selected >= 0) answers[questionId] = item.selected
  }
  return answers
}

function getOptionClassName(
  questionId: string,
  optionIndex: number,
  review: QuizAttemptReview | null,
  selected: number | undefined
): string {
  if (!review?.[questionId]) {
    return selected === optionIndex
      ? 'border-primary bg-primary/5'
      : 'border-border hover:bg-muted/50'
  }

  const { correctIndex } = review[questionId]
  const isCorrectOption = optionIndex === correctIndex
  const isSelectedWrong = selected === optionIndex && optionIndex !== correctIndex

  if (isCorrectOption) {
    return 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
  }
  if (isSelectedWrong) {
    return 'border-red-500 bg-red-50 text-red-950 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100'
  }
  return 'border-border opacity-70'
}

export default function LessonQuizPlayer({
  locale,
  courseId,
  lessonId,
  quiz,
  isAr,
}: LessonQuizPlayerProps) {
  const t = useTranslations('courses')
  const { markLessonCompleted } = useLessonPlayer()
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    quiz.lastReview ? buildAnswersFromReview(quiz.lastReview) : {}
  )
  const [review, setReview] = useState<QuizAttemptReview | null>(quiz.lastReview ?? null)
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(
    quiz.lastScore != null && quiz.lastPassed != null
      ? { score: quiz.lastScore, passed: quiz.lastPassed }
      : null
  )
  const [attemptsUsed, setAttemptsUsed] = useState(quiz.attemptsUsed)
  const [pending, startTransition] = useTransition()

  const isReviewing = review != null
  const attemptsLeft = Math.max(0, quiz.max_attempts - attemptsUsed)
  const canSubmit = !isReviewing && attemptsLeft > 0
  const canReplay = isReviewing && attemptsLeft > 0

  const errorMessages: Record<string, string> = useMemo(
    () => ({
      not_enrolled: t('quiz_not_enrolled'),
      max_attempts: t('quiz_max_attempts'),
      no_questions: t('quiz_no_questions'),
      unauthorized: t('quiz_submit_error'),
      quiz_not_found: t('quiz_submit_error'),
      submit_failed: t('quiz_submit_error'),
    }),
    [t]
  )

  const handleSubmit = () => {
    if (quiz.questions.some((q) => answers[q.id] == null)) {
      toast.error(t('quiz_answer_all'))
      return
    }

    startTransition(async () => {
      try {
        const res = await submitQuizAttempt(quiz.quizId, courseId, lessonId, locale, answers)

        if (!res?.success) {
          toast.error(errorMessages[res?.error ?? ''] ?? t('quiz_submit_error'))
          return
        }

        if (res.score == null || res.passed == null || !res.review) {
          toast.error(t('quiz_submit_error'))
          return
        }

        setResult({ score: res.score, passed: res.passed })
        setReview(res.review)
        setAttemptsUsed((count) => count + 1)
        toast.success(res.passed ? t('quiz_passed') : t('quiz_failed'))
        if (res.passed) {
          markLessonCompleted(lessonId)
        }
      } catch {
        toast.error(t('quiz_submit_error'))
      }
    })
  }

  const handleReplay = () => {
    setAnswers({})
    setReview(null)
    setResult(null)
  }

  if (quiz.questions.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        {t('quiz_no_questions')}
      </div>
    )
  }

  const displayScore = result?.score ?? quiz.lastScore ?? 0
  const displayPassed = result?.passed ?? quiz.lastPassed ?? false

  return (
    <div className="space-y-6 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{quiz.title}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{t('quiz_passing', { score: quiz.passing_score })}</span>
          {attemptsUsed > 0 && (
            <span className="num-en">
              {t('quiz_attempts_used', {
                used: attemptsUsed,
                max: quiz.max_attempts,
              })}
            </span>
          )}
        </div>
      </div>

      {isReviewing && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border p-4 text-sm',
            displayPassed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
          )}
        >
          {displayPassed ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <XCircle className="size-5 shrink-0" />
          )}
          <span>
            {t('quiz_score', { score: displayScore })}
            {' — '}
            {displayPassed ? t('quiz_passed') : t('quiz_failed')}
          </span>
        </div>
      )}

      <div className="space-y-6">
        {quiz.questions.map((question, qi) => {
          const text = isAr && question.question_text_ar
            ? question.question_text_ar
            : question.question_text
          const selected = answers[question.id]

          return (
            <fieldset key={question.id} className="space-y-3" disabled={!canSubmit || pending}>
              <legend className="text-sm font-medium">
                <span className="num-en">{qi + 1}.</span> {text}
              </legend>
              <div className="space-y-2">
                {question.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      canSubmit ? 'cursor-pointer' : 'cursor-default',
                      getOptionClassName(question.id, oi, review, selected)
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={oi}
                      checked={selected === oi}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [question.id]: oi }))
                      }
                      className="accent-primary"
                      disabled={!canSubmit || pending}
                    />
                    <span className="flex-1">{opt.text}</span>
                    {isReviewing && review[question.id]?.correctIndex === oi && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    )}
                    {isReviewing &&
                      selected === oi &&
                      review[question.id]?.correctIndex !== oi && (
                        <XCircle className="size-4 shrink-0 text-red-600" />
                      )}
                  </label>
                ))}
              </div>
            </fieldset>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {canSubmit && (
          <Button onClick={handleSubmit} disabled={pending} className="gap-2">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {t('quiz_submit')}
          </Button>
        )}
        {canReplay && (
          <Button type="button" variant="outline" onClick={handleReplay} className="gap-2">
            <RotateCcw className="size-4" />
            {t('quiz_replay')}
          </Button>
        )}
      </div>
    </div>
  )
}
