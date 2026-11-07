import 'server-only'

/**
 * Client for the Computiq "learning_assistant" microservice — a student-facing
 * assistant that ranks REAL courses and jobs from the platform's own catalog
 * (it can't invent items) and writes a page-aware bilingual reply. Gated on
 * LEARNING_ASSISTANT_API_URL; all callers must handle the not-configured case.
 */

const TIMEOUT_MS = 25_000

export function getLearningAssistantUrl(): string | null {
  return process.env.LEARNING_ASSISTANT_API_URL?.trim() || null
}
export function isLearningAssistantConfigured(): boolean {
  return Boolean(getLearningAssistantUrl())
}

export interface LaStudent {
  id?: string
  name?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  skills?: string[]
  interests?: string[]
  target_roles?: string[]
  goals?: string
  location?: string
  job_type_pref?: string
  taken?: Array<{ title?: string; skills_taught?: string[] }>
}
export interface LaCourse {
  id: string
  title: string
  description?: string
  level?: string
  skills_taught?: string[]
  tags?: string[]
  prerequisites?: string[]
  duration?: string
  url?: string
}
export interface LaJob {
  id: string
  title: string
  company?: string
  city?: string
  job_type?: string
  required_skills?: string[]
  description?: string
  application_url?: string
  salary_min_iqd?: number
  salary_max_iqd?: number
}
export interface LaCourseResult {
  rank: number
  id: string
  title: string
  level?: string | null
  url?: string
  score: number
  reasons?: string[]
  teaches_new?: string[]
  missing?: string[]
}
export interface LaJobResult {
  rank: number
  id: string
  title: string
  company?: string | null
  city?: string | null
  url?: string | null
  score: number
  match_percent?: number | null
  matched_skills?: string[]
  missing_skills?: string[]
  reasons?: string[]
}
export interface LaChatResult {
  ok: boolean
  answer: string
  language: 'ar' | 'en'
  rtl: boolean
  ai: boolean
  recommended_courses: LaCourseResult[]
  recommended_jobs: LaJobResult[]
  suggested_actions: Array<{ label: string; href: string }>
}

async function postLa<T>(path: string, body: unknown): Promise<T | null> {
  const base = getLearningAssistantUrl()
  if (!base) return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error('[learning-assistant]', path, res.status)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error('[learning-assistant] unreachable:', path, err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export function recommendCourses(input: {
  student: LaStudent
  catalog: LaCourse[]
  limit?: number
}) {
  return postLa<{ ok: boolean; results: LaCourseResult[]; effective_skills: string[] }>(
    '/recommend/courses',
    input
  )
}

export function recommendJobs(input: { student: LaStudent; jobs: LaJob[]; limit?: number }) {
  return postLa<{ ok: boolean; results: LaJobResult[]; effective_skills: string[] }>(
    '/recommend/jobs',
    input
  )
}

export function assistantChat(input: {
  message: string
  student?: LaStudent
  catalog?: LaCourse[]
  jobs?: LaJob[]
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  page?: { path?: string; title?: string; section?: string }
  locale?: 'ar' | 'en'
}) {
  return postLa<LaChatResult>('/chat', input)
}
