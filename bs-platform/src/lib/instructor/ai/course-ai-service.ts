import 'server-only'

import { editWithCvBuilder, isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'
import {
  generateCourseOutline,
  generateLessonQuiz,
  generateLessonContent,
  isTrainerStudioConfigured,
  type TsQuiz,
  type TsLessonContent,
} from '@/lib/instructor/ai/trainer-studio-server'
import { mapTrainerCourseToStructure } from '@/lib/instructor/ai/trainer-studio-mapper'
import {
  buildCourseStructureInstruction,
  buildGenerateQuizInstruction,
  buildQuizFromContentInstruction,
  buildImproveDescriptionInstruction,
  buildImproveLessonInstruction,
} from '@/lib/instructor/ai/course-ai-prompts'
import { buildFallbackCourseStructure } from '@/lib/instructor/ai/course-structure-fallback'
import { safeParseAiJson } from '@/lib/instructor/ai/parse-ai-json'
import {
  descriptionResultSchema,
  improveLessonResultSchema,
  parseAiCourseStructure,
  quizResultSchema,
  quizFromContentResultSchema,
  type generateStructureRequestSchema,
} from '@/lib/instructor/ai/course-ai-schemas'
import type { z } from 'zod'
import type {
  AiCourseStructure,
  AiCourseStructureResponse,
  AiQuizQuestion,
} from '@/types/course-ai'

type GenerateInput = z.infer<typeof generateStructureRequestSchema>

/**
 * Report BS-76: the TrainerStudio /course/outline engine returns only the
 * outline — quizzes and notes come from its /lesson/quiz and /lesson/content
 * endpoints. Enrich each generated lesson with them here so the single
 * "generate course" action saves videos + quizzes + notes together (previously
 * only the CV-builder fallback carried quizzes, so the preferred TrainerStudio
 * path silently dropped them). Best-effort: a lesson keeps its outline if its
 * quiz/notes call fails, and enrichment runs AFTER schema validation so the
 * variable-shaped quiz never rejects the whole structure.
 */
function tsQuizToAiQuestions(quiz: TsQuiz): AiQuizQuestion[] {
  return (quiz.questions ?? [])
    .filter((q) => q.question && (q.options?.length ?? 0) >= 2)
    .slice(0, 5)
    .map((q) => {
      const options = (q.options ?? []).map((o) => String(o))
      const found = options.findIndex(
        (o) => o.trim().toLowerCase() === String(q.answer ?? '').trim().toLowerCase()
      )
      return {
        question_ar: q.question ?? '',
        question_en: q.question ?? '',
        options_ar: options,
        options_en: options,
        correct_option_index: found >= 0 ? found : 0,
      }
    })
}

function tsContentToNotes(content: TsLessonContent): string {
  return [content.body_markdown, ...(content.key_takeaways ?? []), content.exercise]
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number
): Promise<void> {
  let index = 0
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (index < tasks.length) {
      const task = tasks[index++]
      try {
        await task()
      } catch {
        /* best-effort per lesson */
      }
    }
  })
  await Promise.all(workers)
}

async function enrichLessonsWithQuizAndNotes(
  structure: AiCourseStructure,
  input: GenerateInput
): Promise<void> {
  const lang = input.language === 'en' ? 'en' : 'ar'
  const courseTitle = input.courseTitleEn || input.courseTitle
  const tasks: Array<() => Promise<void>> = []

  for (const section of structure.sections) {
    for (const lesson of section.lessons) {
      tasks.push(async () => {
        const ctx = {
          lesson: { title: lang === 'ar' ? lesson.title_ar : lesson.title_en },
          course_title: courseTitle,
          level: input.level,
          language: lang,
        }
        const [quizR, contentR] = await Promise.all([
          generateLessonQuiz({ ...ctx, count: 3 }),
          generateLessonContent(ctx),
        ])
        if (quizR.ok) {
          const questions = tsQuizToAiQuestions(quizR.quiz)
          if (questions.length) lesson.quiz_questions = questions
        }
        if (contentR.ok) {
          const notes = tsContentToNotes(contentR.content)
          if (notes) {
            lesson.notes_ar = notes
            lesson.notes_en = notes
          }
        }
      })
    }
  }

  await runWithConcurrency(tasks, 5)
}

/**
 * Preferred path: TrainerStudio's purpose-built /course/outline engine.
 * The platform stores bilingual (ar+en) structures, so for language 'both' we
 * generate an Arabic and an English outline with the same module/lesson counts
 * and merge them by index; for a single language we mirror it into both fields.
 * Returns null on any failure so the caller falls back to the generic path.
 */
async function generateStructureViaTrainerStudio(
  input: GenerateInput
): Promise<AiCourseStructure | null> {
  const idea = [
    input.courseTitleEn || input.courseTitle,
    input.description,
    `Category: ${input.category}.`,
  ]
    .filter(Boolean)
    .join(' ')

  const common = {
    idea,
    audience: input.targetAudience,
    level: input.level,
    modules_count: 4,
    lessons_per_module: 3,
  }

  try {
    if (input.language === 'both') {
      const [ar, en] = await Promise.all([
        generateCourseOutline({ ...common, language: 'ar' }),
        generateCourseOutline({ ...common, language: 'en' }),
      ])
      if (!ar.ok || !en.ok) return null
      return mapTrainerCourseToStructure(ar.course, en.course)
    }
    const lang = input.language === 'en' ? 'en' : 'ar'
    const single = await generateCourseOutline({ ...common, language: lang })
    if (!single.ok) return null
    return mapTrainerCourseToStructure(single.course)
  } catch {
    return null
  }
}

export async function generateCourseStructureWithAi(
  input: GenerateInput
): Promise<
  | { ok: true; data: AiCourseStructureResponse }
  | { ok: false; status: number; message: string }
> {
  // Prefer the dedicated TrainerStudio course engine when configured.
  if (isTrainerStudioConfigured()) {
    const structure = await generateStructureViaTrainerStudio(input)
    if (structure) {
      const validated = parseAiCourseStructure(structure)
      if (validated) {
        // Report BS-76: attach quizzes + notes from TrainerStudio's per-lesson
        // engines so they're saved alongside the videos in one pass.
        await enrichLessonsWithQuizAndNotes(validated, input)
        return { ok: true, data: { ...validated, isFallback: false } }
      }
    }
    // fall through to the generic CV-builder /edit path or local fallback
  }

  if (!isCvBuilderConfigured()) {
    const fallback = buildFallbackCourseStructure(
      input.courseTitle,
      input.courseTitleEn,
      input.category,
      input.level
    )
    return { ok: true, data: { ...fallback, isFallback: true } }
  }

  const instruction = buildCourseStructureInstruction({
    courseTitle: input.courseTitle,
    courseTitleEn: input.courseTitleEn,
    description: input.description,
    category: input.category,
    level: input.level,
    language: input.language,
    targetAudience: input.targetAudience,
  })

  const result = await editWithCvBuilder(
    {
      instruction,
      content: input.description,
    },
    45_000
  )

  if (!result.ok) {
    const status = result.status === 408 ? 408 : result.status >= 500 ? 502 : result.status
    if (status === 408 || status === 502) {
      const fallback = buildFallbackCourseStructure(
        input.courseTitle,
        input.courseTitleEn,
        input.category,
        input.level
      )
      return { ok: true, data: { ...fallback, isFallback: true } }
    }
    return { ok: false, status, message: result.message }
  }

  const raw = safeParseAiJson(result.result)
  const structure = raw ? parseAiCourseStructure(raw) : null

  if (!structure) {
    const fallback = buildFallbackCourseStructure(
      input.courseTitle,
      input.courseTitleEn,
      input.category,
      input.level
    )
    return { ok: true, data: { ...fallback, isFallback: true } }
  }

  return { ok: true, data: { ...structure, isFallback: false } }
}

export async function callAiJsonEdit<T>(
  instruction: string,
  content: string,
  validate: (raw: unknown) => T | null
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  if (!isCvBuilderConfigured()) {
    return { ok: false, status: 503, message: 'ai_not_configured' }
  }

  const result = await editWithCvBuilder({ instruction, content })
  if (!result.ok) {
    const status = result.status === 408 ? 408 : result.status >= 500 ? 502 : result.status
    return { ok: false, status, message: result.message }
  }

  const raw = safeParseAiJson(result.result)
  const data = raw ? validate(raw) : null
  if (!data) {
    return { ok: false, status: 502, message: 'invalid_ai_response' }
  }

  return { ok: true, data }
}

export async function improveLessonWithAi(input: {
  lessonTitle: string
  lessonTitleEn: string
  currentDescription: string
  sectionTitle: string
  courseTitle: string
  level: string
}) {
  const instruction = buildImproveLessonInstruction(input)
  return callAiJsonEdit(instruction, input.currentDescription, (raw) => {
    const parsed = improveLessonResultSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  })
}

/**
 * Report BS-94: AI quiz creation produced nothing.
 *
 * Every AI text tool routed through `callAiJsonEdit` -> the CV-builder service,
 * which is returning `OpenRouter 402` (its configured max_tokens exceeds the
 * account balance). TrainerStudio, meanwhile, is funded and ships a
 * purpose-built `/lesson/quiz` endpoint that the course generator already uses.
 *
 * So quiz generation now asks TrainerStudio first — bilingually, so the ar and
 * en columns are genuinely translated rather than mirrored — and only falls
 * back to the CV-builder path if TrainerStudio is unavailable.
 */
export async function generateQuizWithAi(input: {
  lessonTitle: string
  lessonTitleEn: string
  lessonDescription: string
  courseLevel: string
}): Promise<
  { ok: true; data: { questions: AiQuizQuestion[] } } | { ok: false; status: number; message: string }
> {
  const viaStudio = await generateQuizViaTrainerStudio(input)
  if (viaStudio) return { ok: true, data: { questions: viaStudio } }

  const instruction = buildGenerateQuizInstruction(input)
  return callAiJsonEdit(instruction, input.lessonDescription, (raw) => {
    const parsed = quizResultSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  })
}

/** Bilingual quiz from TrainerStudio, or null when it cannot answer. */
async function generateQuizViaTrainerStudio(input: {
  lessonTitle: string
  lessonTitleEn: string
  lessonDescription: string
  courseLevel: string
}): Promise<AiQuizQuestion[] | null> {
  if (!isTrainerStudioConfigured()) return null

  const base = {
    lesson: {
      title: input.lessonTitleEn || input.lessonTitle,
      summary: input.lessonDescription,
    },
    level: input.courseLevel,
    count: 3,
  }

  try {
    const [ar, en] = await Promise.all([
      generateLessonQuiz({ ...base, lesson: { ...base.lesson, title: input.lessonTitle }, language: 'ar' }),
      generateLessonQuiz({ ...base, language: 'en' }),
    ])

    const arQ = ar.ok ? tsQuizToAiQuestions(ar.quiz) : []
    const enQ = en.ok ? tsQuizToAiQuestions(en.quiz) : []

    // The service returns a variable number of questions per call, so take
    // whichever side actually reached three (Arabic wins a tie — it is the
    // primary language of the platform).
    const usingAr = arQ.length >= 3 || arQ.length >= enQ.length
    const primary = usingAr ? arQ : enQ
    if (primary.length < 3) return null

    // Pair the two languages by index; fall back to the same text when one
    // side is short, so a question is never left blank.
    return primary.slice(0, 3).map((q, i) => {
      const other = (usingAr ? enQ : arQ)[i]
      const arSide = usingAr ? q : other ?? q
      const enSide = usingAr ? other ?? q : q
      return {
        question_ar: arSide.question_ar,
        question_en: enSide.question_en,
        options_ar: arSide.options_ar,
        options_en:
          enSide.options_en.length === arSide.options_ar.length
            ? enSide.options_en
            : arSide.options_ar,
        correct_option_index: arSide.correct_option_index,
      }
    })
  } catch (err) {
    console.error('[ai-quiz] trainer studio failed:', err)
    return null
  }
}

// Report BS-77: quiz-only generation from instructor-provided content. Uses the
// CV-builder edit path (independent of the TrainerStudio outline engine).
export async function generateQuizFromContentWithAi(input: {
  content: string
  count: number
  level: string
  questionType?: 'multiple_choice' | 'true_false'
}): Promise<
  { ok: true; data: { questions: AiQuizQuestion[] } } | { ok: false; status: number; message: string }
> {
  // BS-94: same reroute as generateQuizWithAi — TrainerStudio is the funded
  // service, so pasted content goes there first as a one-lesson quiz request.
  if (isTrainerStudioConfigured()) {
    try {
      const res = await generateLessonQuiz({
        lesson: {
          title: input.content.slice(0, 120),
          summary: input.content.slice(0, 4000),
        },
        level: input.level,
        language: 'ar',
        count: input.count,
      })
      if (res.ok) {
        const questions = tsQuizToAiQuestions(res.quiz).slice(0, input.count)
        if (questions.length > 0) return { ok: true, data: { questions } }
      }
    } catch (err) {
      console.error('[ai-quiz-from-content] trainer studio failed:', err)
    }
  }

  const instruction = buildQuizFromContentInstruction({
    count: input.count,
    level: input.level,
    questionType: input.questionType,
  })
  return callAiJsonEdit(instruction, input.content, (raw) => {
    const parsed = quizFromContentResultSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  })
}

export async function improveDescriptionWithAi(input: {
  title: string
  titleEn: string
  currentDescription?: string
  category: string
  level: string
  learningOutcomes?: string[]
}) {
  const instruction = buildImproveDescriptionInstruction(input)
  return callAiJsonEdit(
    instruction,
    input.currentDescription ?? input.title,
    (raw) => {
      const parsed = descriptionResultSchema.safeParse(raw)
      return parsed.success ? parsed.data : null
    }
  )
}

function lessonDescriptionJson(description_ar: string, description_en: string): string {
  return JSON.stringify({ description_ar, description_en })
}

export { lessonDescriptionJson }
