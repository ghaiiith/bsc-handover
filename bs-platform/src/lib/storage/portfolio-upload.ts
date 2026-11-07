import { createClient } from '@/lib/supabase/client'
import { MAX_PORTFOLIO_IMAGES } from '@/lib/constants'

const MAX_PORTFOLIO_MB = 2
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadPortfolioImage(
  serviceId: string,
  file: File
): Promise<{ url: string | null; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: 'invalid_type' }
  }

  if (file.size > MAX_PORTFOLIO_MB * 1024 * 1024) {
    return { url: null, error: 'file_too_large' }
  }

  const supabase = createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) return { url: null, error: 'unauthorized' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${authData.user.id}/services/${serviceId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('service-portfolio')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) return { url: null, error: error.message }

  const { data } = supabase.storage.from('service-portfolio').getPublicUrl(path)
  return { url: data.publicUrl }
}

export function validatePortfolioCount(count: number): boolean {
  return count < MAX_PORTFOLIO_IMAGES
}
