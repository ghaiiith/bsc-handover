import { NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/profile/get-user-profile'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Report BS-22: upload a single portfolio-entry image and return its public URL.
 * Independent of any serviceId so images can be attached while composing entries
 * before the service is saved. Stored in the public `service-portfolio` bucket
 * under the user's folder.
 */
export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'image_only' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  const admin = createAdminClient()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/items/${Date.now()}-${Math.floor(performance.now())}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await admin.storage
    .from('service-portfolio')
    .upload(path, buffer, { contentType: file.type, upsert: true })
  if (error) {
    console.error('[services/portfolio-image]', error.message)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }

  const { data } = admin.storage.from('service-portfolio').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
