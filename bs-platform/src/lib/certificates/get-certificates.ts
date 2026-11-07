import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Certificate, CertificateWithCourse } from '@/types/certificate'

export async function getCertificateByCode(
  code: string
): Promise<Certificate | null> {
  const admin = createAdminClient()
  const normalized = code.trim().toUpperCase()

  const { data, error } = await admin
    .from('certificates')
    .select('*')
    .eq('verification_code', normalized)
    .maybeSingle()

  if (error || !data) return null
  return data as Certificate
}

export async function getStudentCertificates(
  userId: string
): Promise<CertificateWithCourse[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('certificates')
    .select('*, course:courses(thumbnail_url, category)')
    .eq('student_id', userId)
    .order('issued_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => {
    const courseRaw = row.course as
      | { thumbnail_url?: string | null; category?: string | null }
      | { thumbnail_url?: string | null; category?: string | null }[]
      | null
    const course = Array.isArray(courseRaw) ? courseRaw[0] : courseRaw
    const { course: _c, ...cert } = row
    return {
      ...(cert as Certificate),
      course_thumbnail_url: course?.thumbnail_url ?? null,
      course_category: course?.category ?? null,
    }
  })
}

export async function getPortfolioCertificates(
  userId: string
): Promise<Certificate[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('certificates')
    .select('*')
    .eq('student_id', userId)
    .order('issued_at', { ascending: false })
    .limit(12)

  return (data ?? []) as Certificate[]
}
