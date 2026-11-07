import 'server-only'

/**
 * Client for the TrainerStudio AI course-authoring service
 * (https://trainerstudio-production.up.railway.app). Purpose-built for course
 * generation — outline, lesson content, quizzes, refine, trainer bio.
 * Gated on TRAINER_STUDIO_API_URL; callers must handle the not-configured case.
 */

const DEFAULT_TIMEOUT = 60_000
const OUTLINE_TIMEOUT = 90_000
const PPTX_TIMEOUT = 90_000

export function getTrainerStudioUrl(): string | null {
  return process.env.TRAINER_STUDIO_API_URL?.trim() || null
}

export function isTrainerStudioConfigured(): boolean {
  return Boolean(getTrainerStudioUrl())
}

async function postTrainer<T>(
  path: string,
  body: unknown,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const base = getTrainerStudioUrl()
  if (!base) return { ok: false, status: 503, message: 'trainer_studio_not_configured' }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status >= 500 ? 502 : res.status, message: text || 'trainer_studio_error' }
    }
    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, status: 408, message: 'trainer_studio_timeout' }
    }
    return { ok: false, status: 502, message: 'trainer_studio_unreachable' }
  } finally {
    clearTimeout(timeout)
  }
}

// ---- Response shapes (subset of the OpenAPI schema we consume) ----

export interface TsLesson {
  id?: string
  title?: string
  summary?: string
  duration_min?: number | null
  key_points?: string[]
}

export interface TsModule {
  id?: string
  title?: string
  summary?: string
  lessons?: TsLesson[]
}

export interface TsCourse {
  title?: string
  subtitle?: string
  description?: string
  language?: string
  level?: string
  audience?: string
  duration?: string
  outcomes?: string[]
  prerequisites?: string[]
  modules?: TsModule[]
  cover?: { concept?: string; prompt?: string; palette?: string[] }
}

export interface TsQuiz {
  title?: string
  questions?: Array<{
    type?: string
    question?: string
    options?: string[]
    answer?: string
    explanation?: string
    difficulty?: string
  }>
}

export interface TsLessonContent {
  title?: string
  video_title?: string
  video_script?: string
  body_markdown?: string
  key_takeaways?: string[]
  glossary?: Array<{ term: string; definition: string }>
  exercise?: string
}

export interface CourseOutlineParams {
  idea: string
  audience?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  language?: string
  modules_count?: number
  lessons_per_module?: number
}

export async function generateCourseOutline(
  params: CourseOutlineParams
): Promise<{ ok: true; course: TsCourse } | { ok: false; status: number; message: string }> {
  const result = await postTrainer<{ ok?: boolean; course?: TsCourse }>(
    '/course/outline',
    params,
    OUTLINE_TIMEOUT
  )
  if (!result.ok) return result
  if (!result.data.course) return { ok: false, status: 502, message: 'empty_outline' }
  return { ok: true, course: result.data.course }
}

export interface LessonContext {
  lesson: { title: string; summary?: string; key_points?: string[]; duration_min?: number }
  course_title?: string
  module_title?: string
  audience?: string
  level?: string
  language?: string
}

export async function generateLessonContent(
  ctx: LessonContext
): Promise<{ ok: true; content: TsLessonContent } | { ok: false; status: number; message: string }> {
  const result = await postTrainer<{ ok?: boolean; content?: TsLessonContent }>('/lesson/content', ctx)
  if (!result.ok) return result
  if (!result.data.content) return { ok: false, status: 502, message: 'empty_content' }
  return { ok: true, content: result.data.content }
}

export async function generateLessonQuiz(
  ctx: LessonContext & { count?: number }
): Promise<{ ok: true; quiz: TsQuiz } | { ok: false; status: number; message: string }> {
  const result = await postTrainer<{ ok?: boolean; quiz?: TsQuiz }>('/lesson/quiz', ctx)
  if (!result.ok) return result
  if (!result.data.quiz) return { ok: false, status: 502, message: 'empty_quiz' }
  return { ok: true, quiz: result.data.quiz }
}

// ---- Report BS-30: slide deck + rendered PPTX ----

export interface TsSlide {
  title?: string
  bullets?: string[]
  notes?: string
  image?: string
  layout?: string
}

export interface TsDeck {
  title?: string
  subtitle?: string
  theme?: string
  author?: string
  rtl?: boolean
  slides?: TsSlide[]
}

/** Lesson → deck spec (JSON). Render it with `renderDeckToPptx`. */
export async function generateLessonSlides(
  ctx: LessonContext
): Promise<{ ok: true; deck: TsDeck } | { ok: false; status: number; message: string }> {
  const result = await postTrainer<{ ok?: boolean; deck?: TsDeck }>('/lesson/slides', ctx)
  if (!result.ok) return result
  if (!result.data.deck) return { ok: false, status: 502, message: 'empty_deck' }
  return { ok: true, deck: result.data.deck }
}

/**
 * Deck spec → a real .pptx. `format: 'base64'` keeps the response JSON so the
 * route can hand the bytes straight to storage.
 */
export async function renderDeckToPptx(
  deck: TsDeck
): Promise<
  | { ok: true; filename: string; bytes: Buffer }
  | { ok: false; status: number; message: string }
> {
  const result = await postTrainer<{ ok?: boolean; filename?: string; pptx_base64?: string }>(
    '/pptx',
    { deck, format: 'base64' },
    PPTX_TIMEOUT
  )
  if (!result.ok) return result
  if (!result.data.pptx_base64) return { ok: false, status: 502, message: 'empty_pptx' }

  return {
    ok: true,
    filename: result.data.filename || 'slides.pptx',
    bytes: Buffer.from(result.data.pptx_base64, 'base64'),
  }
}

export async function generateTrainerBio(input: {
  name?: string
  headline?: string
  expertise?: string | string[]
  experience?: string
  achievements?: string | string[]
  tone?: string
  language?: string
}): Promise<
  | { ok: true; profile: { headline?: string; short_bio?: string; bio?: string; highlights?: string[] } }
  | { ok: false; status: number; message: string }
> {
  const result = await postTrainer<{
    ok?: boolean
    profile?: { headline?: string; short_bio?: string; bio?: string; highlights?: string[] }
  }>('/trainer/bio', input)
  if (!result.ok) return result
  if (!result.data.profile) return { ok: false, status: 502, message: 'empty_bio' }
  return { ok: true, profile: result.data.profile }
}
