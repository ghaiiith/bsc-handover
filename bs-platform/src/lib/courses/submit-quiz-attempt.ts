'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recordCourseCompletionIfEligible } from '@/lib/certificates/completion-actions'
import type { QuizAttemptReview } from '@/types/quiz'

export interface SubmitQuizAttemptResult {
  success: boolean
  score?: number
  passed?: boolean
  review?: QuizAttemptReview
  error?: string
}

async function canSubmitQuiz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  courseId: string,
  lessonId: string
): Promise<boolean> {
  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .maybeSingle()

  if (course?.instructor_id === userId) return true

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'admin') return true

  const { data: lesson } = await supabase
    .from('lessons')
    .select('is_free_preview')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (lesson?.is_free_preview) return true

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  return Boolean(enrollment)
}

function safeRevalidate(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path)
    } catch {
      /* non-fatal */
    }
  }
}

export async function submitQuizAttempt(
  quizId: string,
  courseId: string,
  lessonId: string,
  locale: string,
  answers: Record<string, number>
): Promise<SubmitQuizAttemptResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'unauthorized' }
    }

    const allowed = await canSubmitQuiz(supabase, user.id, courseId, lessonId)
    if (!allowed) {
      return { success: false, error: 'not_enrolled' }
    }

    const { data: quiz } = await supabase
      .from('course_quizzes')
      .select('id, passing_score, max_attempts')
      .eq('id', quizId)
      .eq('course_id', courseId)
      .maybeSingle()

    if (!quiz) {
      return { success: false, error: 'quiz_not_found' }
    }

    const { count: attemptCount } = await supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)

    if (attemptCount != null && attemptCount >= (quiz.max_attempts ?? 3)) {
      return { success: false, error: 'max_attempts' }
    }

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, correct_answer, points')
      .eq('quiz_id', quizId)
      .order('order_index')

    if (!questions?.length) {
      return { success: false, error: 'no_questions' }
    }

    let earned = 0
    let total = 0
    const gradedAnswers: Record<string, number> = {}
    const review: QuizAttemptReview = {}

    for (const question of questions) {
      const points = question.points ?? 1
      total += points
      const questionId = question.id as string
      const selected = answers[questionId]
      gradedAnswers[questionId] = selected ?? -1
      const correct = question.correct_answer as { index?: number } | null
      const correctIndex = correct?.index ?? 0
      const isCorrect = selected === correctIndex
      if (isCorrect) {
        earned += points
      }
      review[questionId] = {
        selected: selected ?? -1,
        correctIndex,
        isCorrect,
      }
    }

    const score = total > 0 ? Math.round((earned / total) * 100) : 0
    const passed = score >= (quiz.passing_score ?? 70)

    const { error: attemptError } = await supabase.from('quiz_attempts').insert({
      quiz_id: quizId,
      student_id: user.id,
      score,
      passed,
      answers: gradedAnswers,
      completed_at: new Date().toISOString(),
    })

    if (attemptError) {
      return { success: false, error: attemptError.message }
    }

    if (passed) {
      const { error: progressError } = await supabase.from('lesson_progress').upsert(
        {
          student_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,lesson_id' }
      )

      if (progressError) {
        console.error('[submitQuizAttempt] lesson_progress upsert failed:', progressError.message)
      } else {
        await recordCourseCompletionIfEligible(user.id, courseId, locale)
      }
    }

    safeRevalidate([`/${locale}/dashboard/my-learning`])

    return { success: true, score, passed, review }
  } catch (err) {
    console.error('[submitQuizAttempt]', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'submit_failed',
    }
  }
}
