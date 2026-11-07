'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCourseForEdit } from '@/lib/instructor/get-course-for-edit'

export interface QuizQuestionInput {
  question_text: string
  options: string[]
  correct_index: number
}

export async function ensureLessonQuiz(
  courseId: string,
  lessonId: string,
  title: string
): Promise<{ success: boolean; quizId?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'unauthorized' }

  const course = await getCourseForEdit(courseId, user.id)
  if (!course) return { success: false, error: 'not_found' }

  const { data: existing } = await supabase
    .from('course_quizzes')
    .select('id')
    .eq('course_id', courseId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (existing?.id) {
    return { success: true, quizId: existing.id as string }
  }

  const { data: quiz, error } = await supabase
    .from('course_quizzes')
    .insert({
      course_id: courseId,
      lesson_id: lessonId,
      title: title.trim() || 'Quiz',
      passing_score: 70,
    })
    .select('id')
    .single()

  if (error || !quiz) {
    return { success: false, error: error?.message ?? 'quiz_create_failed' }
  }

  return { success: true, quizId: quiz.id as string }
}

export async function syncLessonQuizTitle(
  courseId: string,
  lessonId: string,
  title: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('course_quizzes')
    .update({ title: title.trim() })
    .eq('course_id', courseId)
    .eq('lesson_id', lessonId)
}

export async function createCourseQuiz(
  courseId: string,
  locale: string,
  input: {
    title: string
    passing_score?: number
    lesson_id?: string | null
    questions: QuizQuestionInput[]
  }
): Promise<{ success: boolean; quizId?: string; error?: string }> {
  if (!input.lesson_id) {
    return { success: false, error: 'lesson_required' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'unauthorized' }

  const course = await getCourseForEdit(courseId, user.id)
  if (!course) return { success: false, error: 'not_found' }

  const { data: existing } = await supabase
    .from('course_quizzes')
    .select('id')
    .eq('course_id', courseId)
    .eq('lesson_id', input.lesson_id)
    .maybeSingle()

  if (existing?.id) {
    return updateCourseQuiz(existing.id as string, courseId, locale, input).then((r) =>
      r.success ? { success: true, quizId: existing.id as string } : r
    )
  }

  const { data: quiz, error: quizError } = await supabase
    .from('course_quizzes')
    .insert({
      course_id: courseId,
      lesson_id: input.lesson_id ?? null,
      title: input.title.trim(),
      passing_score: input.passing_score ?? 70,
    })
    .select('id')
    .single()

  if (quizError || !quiz) {
    return { success: false, error: quizError?.message ?? 'quiz_create_failed' }
  }

  if (input.questions.length > 0) {
    const rows = input.questions.map((q, index) => ({
      quiz_id: quiz.id,
      question_type: 'multiple_choice',
      question_text: q.question_text.trim(),
      options: q.options.map((opt) => ({ text: opt.trim() })),
      correct_answer: { index: q.correct_index },
      points: 1,
      order_index: index,
    }))

    const { error: questionsError } = await supabase.from('quiz_questions').insert(rows)
    if (questionsError) {
      return { success: false, error: questionsError.message }
    }
  }

  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/quizzes`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/curriculum`)
  return { success: true, quizId: quiz.id as string }
}

export interface InstructorQuizData {
  id: string
  title: string
  passing_score: number
  lesson_id: string | null
  questions: QuizQuestionInput[]
}

export async function getQuizForInstructor(
  courseId: string,
  lessonId?: string | null,
  quizId?: string | null
): Promise<InstructorQuizData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const course = await getCourseForEdit(courseId, user.id)
  if (!course) return null

  let query = supabase
    .from('course_quizzes')
    .select('id, title, passing_score, lesson_id')
    .eq('course_id', courseId)

  if (quizId) {
    query = query.eq('id', quizId)
  } else if (lessonId) {
    query = query.eq('lesson_id', lessonId)
  } else {
    return null
  }

  const { data: quiz } = await query.maybeSingle()
  if (!quiz) return null

  const { data: questionRows } = await supabase
    .from('quiz_questions')
    .select('question_text, options, correct_answer, order_index')
    .eq('quiz_id', quiz.id)
    .order('order_index')

  const questions: QuizQuestionInput[] = (questionRows ?? []).map((row) => {
    const options = (row.options as { text: string }[]) ?? []
    const correct = row.correct_answer as { index?: number } | null
    return {
      question_text: row.question_text as string,
      options: options.map((o) => o.text),
      correct_index: correct?.index ?? 0,
    }
  })

  return {
    id: quiz.id as string,
    title: quiz.title as string,
    passing_score: quiz.passing_score ?? 70,
    lesson_id: quiz.lesson_id as string | null,
    questions,
  }
}

export async function updateCourseQuiz(
  quizId: string,
  courseId: string,
  locale: string,
  input: {
    title: string
    passing_score?: number
    lesson_id?: string | null
    questions: QuizQuestionInput[]
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'unauthorized' }

  const course = await getCourseForEdit(courseId, user.id)
  if (!course) return { success: false, error: 'not_found' }

  const { data: existingQuiz } = await supabase
    .from('course_quizzes')
    .select('lesson_id')
    .eq('id', quizId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!existingQuiz) return { success: false, error: 'not_found' }

  const { error: quizError } = await supabase
    .from('course_quizzes')
    .update({
      title: input.title.trim(),
      passing_score: input.passing_score ?? 70,
      lesson_id: input.lesson_id ?? existingQuiz.lesson_id,
    })
    .eq('id', quizId)
    .eq('course_id', courseId)

  if (quizError) return { success: false, error: quizError.message }

  await supabase.from('quiz_questions').delete().eq('quiz_id', quizId)

  const validQuestions = input.questions.filter((q) => q.question_text.trim())
  if (validQuestions.length > 0) {
    const rows = validQuestions.map((q, index) => ({
      quiz_id: quizId,
      question_type: 'multiple_choice',
      question_text: q.question_text.trim(),
      options: q.options.map((opt) => ({ text: opt.trim() })),
      correct_answer: { index: q.correct_index },
      points: 1,
      order_index: index,
    }))

    const { error: questionsError } = await supabase.from('quiz_questions').insert(rows)
    if (questionsError) return { success: false, error: questionsError.message }
  }

  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/quizzes`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/curriculum`)
  return { success: true }
}
