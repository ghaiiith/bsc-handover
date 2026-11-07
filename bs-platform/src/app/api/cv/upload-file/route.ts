import { NextResponse } from 'next/server'
import { MAX_CV_BYTES } from '@/lib/profile/profile-constants'
import { getAuthenticatedUserId } from '@/lib/profile/get-user-profile'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Report BS-13: store a student's own CV (PDF) so it can be attached to job
 * applications, alongside the built-in builder.
 */
export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'pdf_only' }, { status: 400 })
  }
  if (file.size > MAX_CV_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  const admin = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60) || 'cv.pdf'
  const path = `${userId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await admin.storage
    .from('cv-uploads')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    console.error('[cv/upload-file]', uploadError.message)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }

  const { data: pub } = admin.storage.from('cv-uploads').getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: dbError } = await admin
    .from('users')
    .update({ uploaded_cv_url: publicUrl, uploaded_cv_name: file.name })
    .eq('id', userId)

  if (dbError) {
    console.error('[cv/upload-file] db:', dbError.message)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl, name: file.name })
}

/** Remove the uploaded CV reference (the stored file is left; URL is unguessable). */
export async function DELETE() {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ uploaded_cv_url: null, uploaded_cv_name: null })
    .eq('id', userId)
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
