import { NextResponse } from 'next/server'
import { parseCvFile, isCvBuilderConfigured } from '@/lib/profile/cv-builder-api'
import { mapResumeToProfile } from '@/lib/profile/cv-mapper'
import { MAX_CV_BYTES } from '@/lib/profile/profile-constants'
import { getAuthenticatedUserId } from '@/lib/profile/get-user-profile'

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!isCvBuilderConfigured()) {
    return NextResponse.json({ error: 'cv_builder_not_configured' }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'pdf_or_docx_only' }, { status: 400 })
  }

  if (file.size > MAX_CV_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  const parsed = await parseCvFile(file)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: parsed.status })
  }

  const profile = mapResumeToProfile(parsed.resume)
  return NextResponse.json({ profile })
}
