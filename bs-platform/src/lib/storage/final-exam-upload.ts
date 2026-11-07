import { createClient } from '@/lib/supabase/client'

const MAX_EXAM_PDF_BYTES = 10 * 1024 * 1024

export function validateExamPdfFile(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return 'invalid_type'
  }
  if (file.size > MAX_EXAM_PDF_BYTES) {
    return 'file_too_large'
  }
  return null
}

export async function uploadInstructorExamPdf(
  courseId: string,
  file: File
): Promise<{ path: string | null; error?: string }> {
  const validationError = validateExamPdfFile(file)
  if (validationError) return { path: null, error: validationError }

  const supabase = createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) return { path: null, error: 'unauthorized' }

  const path = `${authData.user.id}/${courseId}/exam-${Date.now()}.pdf`

  const { error } = await supabase.storage.from('final-exam-materials').upload(path, file, {
    upsert: true,
    contentType: 'application/pdf',
  })

  if (error) return { path: null, error: error.message }
  return { path }
}

export async function uploadStudentExamAnswer(
  courseId: string,
  file: File
): Promise<{ path: string | null; error?: string }> {
  const validationError = validateExamPdfFile(file)
  if (validationError) return { path: null, error: validationError }

  const supabase = createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) return { path: null, error: 'unauthorized' }

  const path = `${authData.user.id}/${courseId}/${Date.now()}.pdf`

  const { error } = await supabase.storage.from('final-exam-submissions').upload(path, file, {
    upsert: false,
    contentType: 'application/pdf',
  })

  if (error) return { path: null, error: error.message }
  return { path }
}
