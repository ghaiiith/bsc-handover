import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FinalExamSubmission } from '@/types/certificate'

export interface EnrollmentCertStatus {
  hasCertificate: boolean
  certificateCode?: string
  finalExamRequired: boolean
  certificateEnabled: boolean
  examSubmission?: Pick<
    FinalExamSubmission,
    'status' | 'instructor_feedback' | 'submitted_at' | 'reviewed_at'
  > | null
  courseCompleted: boolean
}

export async function getEnrollmentCertStatuses(
  userId: string,
  courseIds: string[]
): Promise<Map<string, EnrollmentCertStatus>> {
  const result = new Map<string, EnrollmentCertStatus>()
  if (courseIds.length === 0) return result

  const supabase = await createClient()

  const [{ data: courses }, { data: completions }, { data: certificates }, { data: submissions }] =
    await Promise.all([
      supabase
        .from('courses')
        .select('id, certificate_enabled, final_exam_required')
        .in('id', courseIds),
      supabase
        .from('course_completions')
        .select('course_id')
        .eq('student_id', userId)
        .in('course_id', courseIds),
      supabase
        .from('certificates')
        .select('course_id, verification_code')
        .eq('student_id', userId)
        .in('course_id', courseIds),
      supabase
        .from('final_exam_submissions')
        .select('course_id, status, instructor_feedback, submitted_at, reviewed_at')
        .eq('student_id', userId)
        .in('course_id', courseIds),
    ])

  const completionSet = new Set((completions ?? []).map((c) => c.course_id as string))
  const certMap = new Map(
    (certificates ?? []).map((c) => [c.course_id as string, c.verification_code as string])
  )
  const submissionMap = new Map(
    (submissions ?? []).map((s) => [s.course_id as string, s as FinalExamSubmission])
  )
  const courseMap = new Map(
    (courses ?? []).map((c) => [
      c.id as string,
      {
        certificate_enabled: Boolean(c.certificate_enabled),
        final_exam_required: Boolean(c.final_exam_required),
      },
    ])
  )

  for (const courseId of courseIds) {
    const course = courseMap.get(courseId)
    const submission = submissionMap.get(courseId)
    result.set(courseId, {
      certificateEnabled: course?.certificate_enabled ?? false,
      finalExamRequired: course?.final_exam_required ?? false,
      courseCompleted: completionSet.has(courseId),
      hasCertificate: certMap.has(courseId),
      certificateCode: certMap.get(courseId),
      examSubmission: submission
        ? {
            status: submission.status,
            instructor_feedback: submission.instructor_feedback,
            submitted_at: submission.submitted_at,
            reviewed_at: submission.reviewed_at,
          }
        : null,
    })
  }

  return result
}

export async function getFinalExamSubmissionsForCourse(
  courseId: string,
  instructorId: string
): Promise<
  Array<
    FinalExamSubmission & {
      student: {
        id: string
        full_name: string
        full_name_ar?: string | null
        email: string
        avatar_url?: string | null
      }
    }
  >
> {
  const admin = createAdminClient()

  const { data: course } = await admin
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single()

  if (!course || course.instructor_id !== instructorId) return []

  const { data, error } = await admin
    .from('final_exam_submissions')
    .select(
      '*, student:users!student_id(id, full_name, full_name_ar, email, avatar_url)'
    )
    .eq('course_id', courseId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('[certificates] getFinalExamSubmissionsForCourse:', error.message)
    return []
  }

  return (data ?? [])
    .map((row) => {
      const studentRaw = row.student
      const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw
      if (!student?.id) return null
      const { student: _s, ...submission } = row
      return { ...(submission as FinalExamSubmission), student }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
}

export async function createSignedExamUrl(
  bucket: 'final-exam-materials' | 'final-exam-submissions',
  path: string,
  ttlSeconds = 3600
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, ttlSeconds)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
