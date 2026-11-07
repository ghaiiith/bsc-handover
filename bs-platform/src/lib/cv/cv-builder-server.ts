import 'server-only'

import type { ResumeInput } from '@/types/cv'
import {
  buildAiStubResume,
  cvBuilderToResumeInput,
  resumeInputToCvBuilder,
  type CvBuilderResume,
} from '@/lib/cv/cv-builder-mapper'

const TIMEOUT_MS = 30_000
const GENERATE_TIMEOUT_MS = 60_000
const RANK_TIMEOUT_MS = 60_000

export interface CvBuilderHealth {
  ok: boolean
  service: string
  model: string
  ai_enabled: boolean
}

function getCvBuilderUrl(): string | null {
  return process.env.CV_BUILDER_API_URL?.trim() || null
}

async function fetchCvBuilderRaw(
  path: string,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS
): Promise<
  | { ok: true; response: Response }
  | { ok: false; status: number; message: string }
> {
  const base = getCvBuilderUrl()
  if (!base) return { ok: false, status: 503, message: 'cv_builder_not_configured' }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      ...init,
      signal: controller.signal,
    })
    return { ok: true, response }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, status: 408, message: 'cv_builder_timeout' }
    }
    return { ok: false, status: 502, message: 'cv_builder_unreachable' }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchCvBuilderJson<T>(
  path: string,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const result = await fetchCvBuilderRaw(path, init, timeoutMs)
  if (!result.ok) return result

  const { response } = result
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = text || 'cv_builder_error'
    try {
      const parsed = JSON.parse(text) as { error?: string; details?: { missing?: string[] } }
      if (parsed.error) message = parsed.error
      if (parsed.details?.missing?.length || parsed.error?.toLowerCase().includes('missing required field')) {
        return {
          ok: false,
          status: response.status >= 500 ? 502 : response.status,
          message: 'missing_required_fields',
        }
      }
    } catch {
      // keep raw text
    }
    if (message.toLowerCase().includes('missing required field')) {
      return {
        ok: false,
        status: response.status >= 500 ? 502 : response.status,
        message: 'missing_required_fields',
      }
    }
    return {
      ok: false,
      status: response.status >= 500 ? 502 : response.status,
      message,
    }
  }

  const data = (await response.json()) as T
  return { ok: true, data }
}

export function isCvBuilderConfigured(): boolean {
  return Boolean(getCvBuilderUrl())
}

export function getCvBuilderBaseUrl(): string | null {
  return getCvBuilderUrl()
}

export async function getCvBuilderHealth(): Promise<
  | { ok: true; health: CvBuilderHealth }
  | { ok: false; status: number; message: string }
> {
  const result = await fetchCvBuilderJson<CvBuilderHealth>('/health', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!result.ok) return result
  return { ok: true, health: result.data }
}

export async function getCvTemplates(): Promise<
  | { ok: true; templates: Array<{ id: string; name: string; description?: string }> }
  | { ok: false; status: number; message: string }
> {
  const result = await fetchCvBuilderJson<{ templates?: Array<{ id: string; name: string; description?: string }> }>(
    '/templates',
    { method: 'GET', headers: { Accept: 'application/json' } }
  )
  if (!result.ok) return result
  return { ok: true, templates: result.data.templates ?? [] }
}

export async function generateCvPdf(
  resume: ResumeInput,
  template: string
): Promise<
  | { ok: true; buffer: ArrayBuffer; contentType: string }
  | { ok: false; status: number; message: string }
> {
  const payload = {
    ...resumeInputToCvBuilder(resume),
    template: template === 'default' ? 'template1' : template,
    format: 'pdf',
  }

  const result = await fetchCvBuilderRaw(
    '/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
      body: JSON.stringify(payload),
    },
    GENERATE_TIMEOUT_MS
  )

  if (!result.ok) return result

  const { response } = result
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = text || 'cv_generate_failed'
    try {
      const parsed = JSON.parse(text) as { error?: string; details?: { missing?: string[] } }
      if (parsed.error) message = parsed.error
      if (parsed.details?.missing?.length) {
        return {
          ok: false,
          status: 400,
          message: 'missing_required_fields',
        }
      }
    } catch {
      // keep raw text
    }
    if (message.toLowerCase().includes('missing required field')) {
      return { ok: false, status: 400, message: 'missing_required_fields' }
    }
    return {
      ok: false,
      status: response.status >= 500 ? 502 : response.status,
      message,
    }
  }

  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') ?? 'application/pdf'
  return { ok: true, buffer, contentType }
}

export async function extractCvText(file: File): Promise<
  | { ok: true; text: string }
  | { ok: false; status: number; message: string }
> {
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mime = file.type || 'application/pdf'
  const dataUrl = `data:${mime};base64,${base64}`

  const result = await fetchCvBuilderJson<{ ok?: boolean; text?: string }>(
    '/extract',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_cv_file: dataUrl }),
    },
    GENERATE_TIMEOUT_MS
  )

  if (!result.ok) return result
  const text = result.data.text?.trim()
  if (!text) {
    return { ok: false, status: 422, message: 'cv_extract_empty' }
  }
  return { ok: true, text }
}

export async function parseCvText(text: string): Promise<
  | { ok: true; resume: ResumeInput }
  | { ok: false; status: number; message: string }
> {
  const result = await fetchCvBuilderJson<{
    ok?: boolean
    profile?: CvBuilderResume
    resume?: CvBuilderResume
  }>('/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_cv: text, embed: false }),
  })

  if (!result.ok) return result

  const profile = result.data.profile ?? result.data.resume
  if (!profile) {
    return { ok: false, status: 502, message: 'cv_parse_empty' }
  }

  return { ok: true, resume: cvBuilderToResumeInput(profile) }
}

export async function parseCvFile(file: File): Promise<
  | { ok: true; resume: ResumeInput }
  | { ok: false; status: number; message: string }
> {
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mime = file.type || 'application/pdf'
  const dataUrl = `data:${mime};base64,${base64}`

  const result = await fetchCvBuilderJson<{
    ok?: boolean
    profile?: CvBuilderResume
    resume?: CvBuilderResume
  }>('/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_cv_file: dataUrl, embed: false }),
  }, GENERATE_TIMEOUT_MS)

  if (!result.ok) return result

  const profile = result.data.profile ?? result.data.resume
  if (!profile) {
    return { ok: false, status: 502, message: 'cv_parse_empty' }
  }

  return { ok: true, resume: cvBuilderToResumeInput(profile) }
}

/**
 * General-purpose AI instruction via CV Builder `/edit`.
 * Uses a minimal resume stub with `content` in the summary field.
 */
export async function editWithCvBuilder(
  payload: {
    instruction: string
    content: string
    context?: Record<string, unknown>
  },
  timeoutMs = TIMEOUT_MS
): Promise<
  | { ok: true; result: string }
  | { ok: false; status: number; message: string }
> {
  const resume = buildAiStubResume(payload.content)

  const result = await fetchCvBuilderJson<{ resume?: CvBuilderResume }>(
    '/edit',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume,
        instruction: payload.instruction,
        context: payload.context,
        format: 'json',
      }),
    },
    timeoutMs
  )

  if (!result.ok) return result

  const summary = result.data.resume?.summary
  const output =
    typeof summary === 'string'
      ? summary.trim()
      : summary != null
        ? JSON.stringify(summary)
        : ''
  if (!output) {
    return { ok: false, status: 502, message: 'cv_builder_empty_response' }
  }
  return { ok: true, result: output }
}

/** Edit a real resume object with a natural-language instruction. */
export async function editResumeWithCvBuilder(
  resume: ResumeInput,
  instruction: string,
  options?: { jobDescription?: string; template?: string }
): Promise<
  | { ok: true; resume: ResumeInput }
  | { ok: false; status: number; message: string }
> {
  const cvResume = resumeInputToCvBuilder(resume)

  const result = await fetchCvBuilderJson<{ resume?: CvBuilderResume }>(
    '/edit',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume: cvResume,
        instruction,
        job_description: options?.jobDescription,
        template: options?.template === 'default' ? 'template1' : options?.template ?? 'template1',
        format: 'json',
      }),
    },
    GENERATE_TIMEOUT_MS
  )

  if (!result.ok) return result
  if (!result.data.resume) {
    return { ok: false, status: 502, message: 'cv_builder_empty_response' }
  }

  return { ok: true, resume: cvBuilderToResumeInput(result.data.resume) }
}

export interface RankApiItem {
  id: string | number
  score?: number
  match_score?: number
  matched_keywords?: string[]
  matched_skills?: string[]
  missing_keywords?: string[]
  missing_skills?: string[]
}

export interface RankApiResponse {
  ranked?: RankApiItem[]
  results?: RankApiItem[]
  candidates?: RankApiItem[]
}

export async function rankCandidatesWithJob(
  jobDescription: string,
  candidates: Array<{ id: string; resume: ResumeInput }>
): Promise<
  | { ok: true; items: Array<{ id: string; score: number; matched_skills: string[]; missing_skills: string[] }> }
  | { ok: false; status: number; message: string }
> {
  const result = await fetchCvBuilderJson<RankApiResponse & { ok?: boolean }>(
    '/rank',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_description: jobDescription,
        candidates: candidates.map((c) => ({
          id: c.id,
          resume: resumeInputToCvBuilder(c.resume),
        })),
      }),
    },
    RANK_TIMEOUT_MS
  )

  if (!result.ok) return result

  const raw = result.data.ranked ?? result.data.results ?? result.data.candidates ?? []
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, status: 502, message: 'empty_rank_response' }
  }

  const items = raw
    .map((item) => {
      const score = item.score ?? item.match_score ?? 0
      const matched = item.matched_keywords ?? item.matched_skills ?? []
      const missing = item.missing_keywords ?? item.missing_skills ?? []
      return {
        id: String(item.id),
        score: Math.round(Math.min(100, Math.max(0, score))),
        matched_skills: Array.isArray(matched) ? matched.map(String) : [],
        missing_skills: Array.isArray(missing) ? missing.map(String) : [],
      }
    })
    .filter((item) => item.id)

  if (items.length === 0) {
    return { ok: false, status: 502, message: 'invalid_rank_response' }
  }

  return { ok: true, items }
}
