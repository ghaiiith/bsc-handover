'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  issueCertificate,
  isCourseFullyComplete,
  recordCourseCompletionIfEligible,
  verifyStudentEnrollment,
} from '@/lib/certificates/completion-actions'
import type { FinalExamSubmissionStatus } from '@/types/certificate'

export async function saveCertificateSettings(
  courseId: string,
  locale: string,
  values: {
    certificate_enabled: boolean
    final_exam_required: boolean
    final_exam_pdf_path?: string | null
    final_exam_pdf_name?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'unauthorized' }

  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single()

  if (!course) {
    return { success: false, error: 'not_found' }
  }
  if (course.instructor_id !== user.id) {
    const { data: examProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (examProfile?.role !== 'admin') {
      return { success: false, error: 'not_found' }
    }
  }

  if (values.final_exam_required && !values.final_exam_pdf_path) {
    return { success: false, error: 'exam_pdf_required' }
  }

  const { error } = await supabase
    .from('courses')
    .update({
      certificate_enabled: values.certificate_enabled,
      final_exam_required: values.certificate_enabled ? values.final_exam_required : false,
      final_exam_pdf_path: values.final_exam_pdf_path ?? null,
      final_exam_pdf_name: values.final_exam_pdf_name ?? null,
    })
    .eq('id', courseId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/certificates`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/settings`)
  return { success: true }
}

export async function submitFinalExamAnswer(
  courseId: string,
  locale: string,
  answerPdfPath: string,
  answerPdfName: string
): Promise<{ success: boolean; error?: string }> {
  if (!answerPdfPath.endsWith('.pdf')) {
    return { success: false, error: 'invalid_file_type' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'unauthorized' }

  const enrolled = await verifyStudentEnrollment(user.id, courseId)
  if (!enrolled) return { success: false, error: 'not_enrolled' }

  const complete = await isCourseFullyComplete(user.id, courseId)
  if (!complete) return { success: false, error: 'course_not_complete' }

  const { data: course } = await supabase
    .from('courses')
    .select('certificate_enabled, final_exam_required')
    .eq('id', courseId)
    .single()

  if (!course?.certificate_enabled || !course.final_exam_required) {
    return { success: false, error: 'exam_not_required' }
  }

  const expectedPrefix = `${user.id}/${courseId}/`
  if (!answerPdfPath.startsWith(expectedPrefix)) {
    return { success: false, error: 'invalid_path' }
  }

  const { data: existing } = await supabase
    .from('final_exam_submissions')
    .select('id, status')
    .eq('course_id', courseId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing?.status === 'pending') {
    return { success: false, error: 'already_pending' }
  }

  if (existing?.status === 'approved') {
    return { success: false, error: 'already_approved' }
  }

  const payload = {
    course_id: courseId,
    student_id: user.id,
    answer_pdf_path: answerPdfPath,
    answer_pdf_name: answerPdfName,
    status: 'pending' as FinalExamSubmissionStatus,
    instructor_feedback: null,
    reviewed_at: null,
    reviewed_by: null,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error } = existing
    ? await supabase
        .from('final_exam_submissions')
        .update(payload)
        .eq('id', existing.id)
    : await supabase.from('final_exam_submissions').insert(payload)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/${locale}/dashboard/my-courses`)
  revalidatePath(`/${locale}/dashboard/my-learning`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/certificates`)
  return { success: true }
}

export async function reviewFinalExamSubmission(
  submissionId: string,
  courseId: string,
  locale: string,
  decision: 'approved' | 'rejected',
  feedback?: string
): Promise<{ success: boolean; error?: string; certificateIssued?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'unauthorized' }

  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id, certificate_enabled')
    .eq('id', courseId)
    .single()

  if (!course) {
    return { success: false, error: 'not_found' }
  }
  if (course.instructor_id !== user.id) {
    const { data: examProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (examProfile?.role !== 'admin') {
      return { success: false, error: 'not_found' }
    }
  }

  const admin = createAdminClient()
  const { data: submission } = await admin
    .from('final_exam_submissions')
    .select('id, student_id, status')
    .eq('id', submissionId)
    .eq('course_id', courseId)
    .single()

  if (!submission) return { success: false, error: 'submission_not_found' }
  if (submission.status !== 'pending') {
    return { success: false, error: 'already_reviewed' }
  }

  const { error } = await admin
    .from('final_exam_submissions')
    .update({
      status: decision,
      instructor_feedback: feedback?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) return { success: false, error: error.message }

  let certificateIssued = false
  if (decision === 'approved' && course.certificate_enabled) {
    certificateIssued = await issueCertificate(
      submission.student_id,
      courseId,
      'exam_approved',
      locale
    )
  }

  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/certificates`)
  revalidatePath(`/${locale}/dashboard/my-courses`)
  return { success: true, certificateIssued }
}

export async function ensureCompletionRecorded(
  courseId: string,
  locale: string
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await recordCourseCompletionIfEligible(user.id, courseId, locale)
}
