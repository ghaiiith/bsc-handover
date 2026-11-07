import { z } from 'zod'
import type { AiCourseStructure } from '@/types/course-ai'

const quizQuestionSchema = z.object({
  question_ar: z.string(),
  question_en: z.string(),
  options_ar: z.array(z.string()).length(4),
  options_en: z.array(z.string()).length(4),
  correct_option_index: z.number().int().min(0).max(3),
})

const lessonSchema = z.object({
  title_ar: z.string().min(2),
  title_en: z.string().min(2),
  duration_estimate_minutes: z.number().int().min(1).max(120),
  description_ar: z.string(),
  description_en: z.string(),
  is_free_preview: z.boolean(),
  quiz_questions: z.array(quizQuestionSchema).optional(),
  notes_ar: z.string().optional(),
  notes_en: z.string().optional(),
})

const sectionSchema = z.object({
  title_ar: z.string().min(2),
  title_en: z.string().min(2),
  lessons: z.array(lessonSchema).min(1),
})

export const aiCourseStructureSchema = z.object({
  sections: z.array(sectionSchema).min(1),
  learning_outcomes_ar: z.array(z.string()).min(1),
  learning_outcomes_en: z.array(z.string()).min(1),
  description_ar: z.string().min(20),
  description_en: z.string().min(20),
  thumbnail_prompt: z.string().min(10),
  estimated_total_hours: z.number().min(0.5),
})

export function parseAiCourseStructure(raw: unknown): AiCourseStructure | null {
  const parsed = aiCourseStructureSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export const generateStructureRequestSchema = z.object({
  courseTitle: z.string().min(5),
  courseTitleEn: z.string().min(5),
  description: z.string().min(20),
  category: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.enum(['ar', 'en', 'both']),
  targetAudience: z.string().optional(),
})

export const improveLessonRequestSchema = z.object({
  lessonTitle: z.string().min(2),
  lessonTitleEn: z.string().min(2),
  currentDescription: z.string(),
  sectionTitle: z.string().min(2),
  courseTitle: z.string().min(2),
  level: z.string().min(1),
})

export const generateQuizRequestSchema = z.object({
  lessonTitle: z.string().min(2),
  lessonTitleEn: z.string().min(2),
  lessonDescription: z.string().min(10),
  courseLevel: z.string().min(1),
})

export const improveDescriptionRequestSchema = z.object({
  title: z.string().min(5),
  titleEn: z.string().min(5),
  currentDescription: z.string().optional(),
  category: z.string().min(1),
  level: z.string().min(1),
  learningOutcomes: z.array(z.string()).optional(),
})

export const descriptionResultSchema = z.object({
  description_ar: z.string().min(20),
  description_en: z.string().min(20),
  learning_outcomes_ar: z.array(z.string()).optional(),
  learning_outcomes_en: z.array(z.string()).optional(),
})

export const improveLessonResultSchema = z.object({
  description_ar: z.string().min(10),
  description_en: z.string().min(10),
})

export const quizResultSchema = z.object({
  questions: z.array(quizQuestionSchema).length(3),
})

// Report BS-77: quiz-only generation from instructor-provided content. Both the
// COUNT and the question TYPE are chosen by the instructor, so options are
// variable-length here (true/false yields 2, multiple choice 4).
const flexibleQuizQuestionSchema = z.object({
  question_ar: z.string(),
  question_en: z.string(),
  options_ar: z.array(z.string()).min(2).max(6),
  options_en: z.array(z.string()).min(2).max(6),
  correct_option_index: z.number().int().min(0).max(5),
})

export const QUIZ_QUESTION_TYPES = ['multiple_choice', 'true_false'] as const
export type QuizQuestionType = (typeof QUIZ_QUESTION_TYPES)[number]

export const quizFromContentResultSchema = z.object({
  questions: z.array(flexibleQuizQuestionSchema).min(1).max(20),
})

export const generateQuizFromContentRequestSchema = z.object({
  content: z.string().min(50).max(20000),
  count: z.number().int().min(1).max(20).optional().default(5),
  level: z.string().min(1).optional().default('intermediate'),
  questionType: z.enum(QUIZ_QUESTION_TYPES).optional().default('multiple_choice'),
})
