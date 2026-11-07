'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_PORTFOLIO_MB = 2
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadAdminPortfolioImage(
  serviceId: string,
  formData: FormData
): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { url: null, error: 'unauthorized' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { url: null, error: 'unauthorized' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { url: null, error: 'invalid_file' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: 'invalid_type' }
  }

  if (file.size > MAX_PORTFOLIO_MB * 1024 * 1024) {
    return { url: null, error: 'file_too_large' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.id}/services/${serviceId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const admin = createAdminClient()
    const { error } = await admin.storage
      .from('service-portfolio')
      .upload(path, buffer, {
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      console.error('[admin/portfolio] upload failed:', error.message)
      return { url: null, error: error.message }
    }

    const { data } = admin.storage.from('service-portfolio').getPublicUrl(path)
    return { url: data.publicUrl }
  } catch (err) {
    console.error('[admin/portfolio] admin client error:', err)
    return { url: null, error: 'upload_failed' }
  }
}
