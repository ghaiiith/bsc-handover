import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUserId } from '@/lib/profile/get-user-profile'
import { editResumeWithCvBuilder, isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'
import { formDataToResumeInput, resumeInputToFormData } from '@/lib/cv/mappers'
import { consumeCvQuota, peekCvQuota } from '@/lib/cv/cv-quota'
import { checkProAccess } from '@/lib/subscription/pro-access'
import type { CVFormData } from '@/types/cv'

/**
 * Report BS-33: the CV Builder chatbot. Sends the user's natural-language
 * instruction plus the current CV state to the CV service `/edit` endpoint and
 * returns the revised CV so the client can apply (and undo) it.
 * Each call consumes one of the user's daily AI allowance (report BS-34).
 */
const bodySchema = z.object({
  instruction: z.string().trim().min(3).max(1000),
  formData: z.any(),
  jobDescription: z.string().max(5000).optional(),
})

/** Remaining allowance, without consuming one. */
export async function GET() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const quota = await peekCvQuota(userId)
  return NextResponse.json({ quota })
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Report BS-49: AI CV features may be gated behind Pro (admin-configurable).
  const access = await checkProAccess(userId, 'ai_cv')
  if (!access.allowed) {
    return NextResponse.json({ error: 'pro_required', feature: access.feature }, { status: 402 })
  }

  if (!isCvBuilderConfigured()) {
    return NextResponse.json({ error: 'cv_builder_not_configured' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // Consume the daily allowance BEFORE calling the paid AI service.
  const quota = await consumeCvQuota(userId)
  if (!quota.allowed) {
    return NextResponse.json({ error: 'daily_limit_reached', quota }, { status: 429 })
  }

  const resume = formDataToResumeInput(parsed.data.formData as CVFormData)
  const result = await editResumeWithCvBuilder(resume, parsed.data.instruction, {
    jobDescription: parsed.data.jobDescription,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.message, quota }, { status: result.status })
  }

  return NextResponse.json({
    formData: resumeInputToFormData(result.resume),
    quota,
  })
}
