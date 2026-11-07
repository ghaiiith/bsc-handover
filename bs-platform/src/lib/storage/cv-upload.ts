import { createClient } from '@/lib/supabase/client'
import { MAX_CV_SIZE_MB } from '@/lib/constants'

interface UploadCvOptions {
  jobId: string
  file: File
  onProgress?: (percent: number) => void
}

export function validateCvFile(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return 'invalid_type'
  }
  const maxBytes = MAX_CV_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return 'file_too_large'
  }
  return null
}

export async function uploadCvFile({
  jobId,
  file,
  onProgress,
}: UploadCvOptions): Promise<{ path: string | null; error?: string }> {
  const validationError = validateCvFile(file)
  if (validationError) {
    return { path: null, error: validationError }
  }

  const supabase = createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return { path: null, error: 'unauthorized' }
  }

  const path = `${authData.user.id}/${jobId}/${Date.now()}.pdf`

  onProgress?.(20)

  const { error } = await supabase.storage.from('cv-files').upload(path, file, {
    upsert: false,
    contentType: 'application/pdf',
  })

  if (error) {
    return { path: null, error: error.message }
  }

  onProgress?.(100)
  return { path }
}
