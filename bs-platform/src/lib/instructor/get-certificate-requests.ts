import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FinalExamSubmissionWithStudent } from '@/types/certificate'

export interface InstructorCertificateRequest extends FinalExamSubmissionWithStudent {
  course_title: string
  course_title_ar: string
}

export async function getInstructorCertificateRequests(
  instructorId: string
): Promise<InstructorCertificateRequest[]> {
  const supabase = await createClient()
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, title_ar')
    .eq('instructor_id', instructorId)

  const courseIds = (courses ?? []).map((c) => c.id as string)
  if (courseIds.length === 0) return []

  const courseMap = new Map(
    (courses ?? []).map((c) => [
      c.id as string,
      { title: c.title as string, title_ar: c.title_ar as string },
    ])
  )

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('final_exam_submissions')
    .select(
      `*,
      student:users!student_id(id, full_name, full_name_ar, email, avatar_url)`
    )
    .in('course_id', courseIds)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('[getInstructorCertificateRequests]', error.message)
    return []
  }

  return (data ?? [])
    .map((row) => {
      const studentRaw = row.student
      const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw
      if (!student?.id) return null
      const course = courseMap.get(row.course_id as string)
      if (!course) return null
      const { student: _s, ...submission } = row
      return {
        ...(submission as Omit<FinalExamSubmissionWithStudent, 'student'>),
        student,
        course_title: course.title,
        course_title_ar: course.title_ar,
      } as InstructorCertificateRequest
    })
    .filter((row): row is InstructorCertificateRequest => row !== null)
}

export async function getInstructorPendingCertificateCount(
  instructorId: string
): Promise<number> {
  const requests = await getInstructorCertificateRequests(instructorId)
  return requests.filter((r) => r.status === 'pending').length
}
