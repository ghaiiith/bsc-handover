'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import QuizStudioDialog from '@/components/instructor/studio/QuizStudioDialog'

export interface StudioQuizListItem {
  id: string
  title: string
  passing_score: number
  questionCount: number
  lessonId: string | null
  lessonTitle: string | null
  lessonTitleAr?: string | null
}

interface StudioQuizzesListProps {
  locale: string
  courseId: string
  quizzes: StudioQuizListItem[]
}

export default function StudioQuizzesList({
  locale,
  courseId,
  quizzes,
}: StudioQuizzesListProps) {
  const t = useTranslations('studio.quizzes')
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingQuiz = quizzes.find((q) => q.id === editingId)
  const isAr = locale === 'ar'

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {quizzes.map((quiz) => {
          const linkedLessonTitle =
            isAr && quiz.lessonTitleAr ? quiz.lessonTitleAr : quiz.lessonTitle

          return (
            <div key={quiz.id} className="edu-card flex flex-col gap-2 p-4">
              <p className="font-medium">{quiz.title}</p>
              {linkedLessonTitle && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0 text-primary/80" />
                  {t('linked_lesson', { title: linkedLessonTitle })}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('passing_score')}: <span className="num-en">{quiz.passing_score}%</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t('question_count', { count: quiz.questionCount })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-fit gap-1.5"
                onClick={() => setEditingId(quiz.id)}
              >
                <Pencil className="size-3.5" />
                {t('edit')}
              </Button>
            </div>
          )
        })}
      </div>

      {editingQuiz && (
        <QuizStudioDialog
          open={Boolean(editingId)}
          onOpenChange={(open) => !open && setEditingId(null)}
          locale={locale}
          courseId={courseId}
          quizId={editingQuiz.id}
          lessonId={editingQuiz.lessonId ?? undefined}
          lessonTitle={
            (isAr && editingQuiz.lessonTitleAr
              ? editingQuiz.lessonTitleAr
              : editingQuiz.lessonTitle) ?? editingQuiz.title
          }
        />
      )}
    </>
  )
}
