import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCvPdf } from '@/lib/cv/cv-builder-server'
import {
  checkCvDownloadRateLimit,
  getClientIp,
} from '@/lib/portfolio/cv-download-rate-limit'
import type { ResumeInput } from '@/types/cv'

const bodySchema = z.object({
  userId: z.string().uuid(),
})

function buildCvFileName(profileName: string): string {
  const sanitized = profileName.replace(/[^\w\s-]/g, '').trim()
  return `${sanitized || 'CV'}.pdf`
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateCheck = checkCvDownloadRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const { userId } = parsed.data
  const admin = createAdminClient()

  const { data: user } = await admin
    .from('users')
    .select('id, portfolio_is_public, is_active, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (!user?.portfolio_is_public || !user.is_active) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('cv_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (!profile) {
    const { data: fallback } = await admin
      .from('cv_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!fallback) {
      return NextResponse.json({ error: 'no_cv' }, { status: 404 })
    }

    return generatePdfResponse(fallback)
  }

  return generatePdfResponse(profile)
}

async function generatePdfResponse(profile: {
  name: string
  resume_data: unknown
  selected_template: string | null
}) {
  const resumeData = profile.resume_data as ResumeInput
  const template = profile.selected_template || 'default'
  const fileName = buildCvFileName(profile.name)

  const generated = await generateCvPdf(resumeData, template)
  if (!generated.ok) {
    return NextResponse.json({ error: generated.message }, { status: generated.status })
  }

  return new NextResponse(generated.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
