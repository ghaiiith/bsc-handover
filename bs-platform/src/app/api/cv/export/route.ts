import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { CV_SIGNED_URL_TTL } from '@/lib/cv/constants'
import { generateCvPdf, isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'
import { getAuthenticatedUserId, getCvProfile } from '@/lib/cv/cv-data'
import { checkProAccess } from '@/lib/subscription/pro-access'
import { consumeCvQuota } from '@/lib/cv/cv-quota'
import {
  applyResumeFallbacks,
  getResumeMissingFields,
} from '@/lib/cv/resume-validation'
import type { ResumeInput } from '@/types/cv'

const exportSchema = z.object({
  profileId: z.string().uuid(),
})

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Report BS-49: AI CV features may be gated behind Pro (admin-configurable).
  const proAccess = await checkProAccess(userId, 'ai_cv')
  if (!proAccess.allowed) {
    return NextResponse.json({ error: 'pro_required', feature: proAccess.feature }, { status: 402 })
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

  const parsed = exportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const profile = await getCvProfile(parsed.data.profileId, userId)
  if (!profile) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const metaName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : undefined

  const resumeData = applyResumeFallbacks(profile.resume_data as ResumeInput, {
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

  const template = profile.selected_template || 'default'

  // Report BS-34: generating a CV consumes one of the user's daily AI allowance.
  const quota = await consumeCvQuota(userId)
  if (!quota.allowed) {
    return NextResponse.json({ error: 'daily_limit_reached', quota }, { status: 429 })
  }

  const generated = await generateCvPdf(resumeData, template)
  if (!generated.ok) {
    return NextResponse.json({ error: generated.message }, { status: generated.status })
  }

  const timestamp = Date.now()
  const storagePath = `${userId}/cv_${profile.id}_${timestamp}.pdf`
  let signedUrl: string | null = null
  let expiresAt: string | null = null
  let fallbackBase64: string | undefined

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('cv-exports')
    .upload(storagePath, generated.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (!uploadError) {
    await admin.from('cv_exports').insert({
      profile_id: profile.id,
      user_id: userId,
      pdf_storage_path: storagePath,
      template_used: template,
    })

    const { data: signed } = await admin.storage
      .from('cv-exports')
      .createSignedUrl(storagePath, CV_SIGNED_URL_TTL)

    if (signed?.signedUrl) {
      signedUrl = signed.signedUrl
      expiresAt = new Date(Date.now() + CV_SIGNED_URL_TTL * 1000).toISOString()
    }
  } else {
    fallbackBase64 = Buffer.from(generated.buffer).toString('base64')
  }

  await supabase
    .from('cv_profiles')
    .update({ last_generated_at: new Date().toISOString() })
    .eq('id', profile.id)
    .eq('user_id', userId)

  return NextResponse.json({
    signedUrl,
    expiresAt,
    pdfBase64: fallbackBase64,
    fileName: `${profile.name.replace(/[^\w\s-]/g, '') || 'CV'}.pdf`,
  })
}
