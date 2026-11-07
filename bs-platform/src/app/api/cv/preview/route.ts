import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateCvPdf, isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'
import {
  applyResumeFallbacks,
  getResumeMissingFields,
} from '@/lib/cv/resume-validation'
import type { ResumeInput } from '@/types/cv'

const previewSchema = z.object({
  resumeData: z.custom<ResumeInput>(),
  template: z.string().min(1),
})

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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

  const parsed = previewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const metaName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : undefined

  const resumeData = applyResumeFallbacks(parsed.data.resumeData, {
    email: user?.email,
    name: metaName,
  })

  const missing = getResumeMissingFields(resumeData)
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'missing_required_fields', fields: missing },
      { status: 400 }
    )
  }

  const result = await generateCvPdf(resumeData, parsed.data.template)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status })
  }

  const base64 = Buffer.from(result.buffer).toString('base64')
  return NextResponse.json({ pdfBase64: base64, contentType: result.contentType })
}
