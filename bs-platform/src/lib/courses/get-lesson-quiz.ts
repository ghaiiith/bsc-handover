import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { QuizAttemptReview } from '@/types/quiz'

export interface StudentQuizQuestion {
  id: string
  question_text: string
  question_text_ar?: string | null
  options: { text: string }[]
  order_index: number
}

export interface StudentQuizData {
  quizId: string
  title: string
  passing_score: number
  max_attempts: number
  attemptsUsed: number
  questions: StudentQuizQuestion[]
  lastScore?: number | null
  lastPassed?: boolean | null
  /** Populated after at least one attempt — powers answer review UI. */
  lastReview?: QuizAttemptReview | null
}

export async function getLessonQuizForStudent(
  lessonId: string,
  courseId: string,
  userId: string
): Promise<StudentQuizData | null> {
  const supabase = await createClient()

  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('id, title, passing_score, max_attempts')
    .eq('lesson_id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!quiz) return null

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, question_text, question_text_ar, options, order_index, correct_answer')
    .eq('quiz_id', quiz.id)
    .order('order_index')

  const { count: attemptsUsed } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quiz.id)
    .eq('student_id', userId)

  const { data: lastAttempt } = await supabase
    .from('quiz_attempts')
    .select('score, passed, answers')
    .eq('quiz_id', quiz.id)
    .eq('student_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const questionRows = questions ?? []
  let lastReview: QuizAttemptReview | null = null

  if (lastAttempt?.answers && questionRows.length > 0) {
    const savedAnswers = lastAttempt.answers as Record<string, number>
    lastReview = {}
    for (const q of questionRows) {
      const questionId = q.id as string
      const correct = q.correct_answer as { index?: number } | null
      const correctIndex = correct?.index ?? 0
      const selected = savedAnswers[questionId] ?? -1
      lastReview[questionId] = {
        selected,
        correctIndex,
        isCorrect: selected === correctIndex,
      }
    }
  }

  return {
    quizId: quiz.id as string,
    title: quiz.title as string,
    passing_score: quiz.passing_score ?? 70,
    max_attempts: quiz.max_attempts ?? 3,
    attemptsUsed: attemptsUsed ?? 0,
    questions: questionRows.map((q) => {
      const rawOptions = (q.options as { text: string }[] | string[] | null) ?? []
      const options = rawOptions.map((opt) =>
        typeof opt === 'string' ? { text: opt } : { text: opt.text ?? '' }
      )
      return {
        id: q.id as string,
        question_text: q.question_text as string,
        question_text_ar: q.question_text_ar as string | null,
        options,
        order_index: q.order_index as number,
      }
    }),
    lastScore: lastAttempt?.score ?? null,
    lastPassed: lastAttempt?.passed ?? null,
    lastReview,
  }
}
