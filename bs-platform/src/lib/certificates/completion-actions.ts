import 'server-only'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeCourseProgressFromSections } from '@/lib/certificates/course-progress'
import { generateVerificationCode } from '@/lib/certificates/verification-code'
import type { CertificateIssuedVia } from '@/types/certificate'

async function getCourseProgressContext(courseId: string, studentId: string) {
  const admin = createAdminClient()

  const { data: course } = await admin
    .from('courses')
    .select(
      'id, title, title_ar, certificate_enabled, final_exam_required, total_lessons, instructor_id, instructor:users(id, full_name, full_name_ar)'
    )
    .eq('id', courseId)
    .single()

  if (!course) return null

  const { data: sections } = await admin
    .from('course_sections')
    .select('order_index, lessons(id, order_index)')
    .eq('course_id', courseId)
    .order('order_index')

  const { data: progressRows } = await admin
    .from('lesson_progress')
    .select('lesson_id')
    .eq('student_id', studentId)
    .eq('completed', true)

  const completedLessonIds = new Set(
    (progressRows ?? []).map((row) => row.lesson_id as string)
  )

  const progress = computeCourseProgressFromSections(
    course,
    (sections ?? []) as { order_index: number; lessons: { id: string; order_index: number }[] | null }[],
    completedLessonIds
  )

  const instructorRaw = course.instructor
  const instructor = Array.isArray(instructorRaw) ? instructorRaw[0] : instructorRaw

  return { course, instructor, progress }
}

export async function recordCourseCompletionIfEligible(
  studentId: string,
  courseId: string,
  locale: string
): Promise<{ completed: boolean; certificateIssued: boolean }> {
  const ctx = await getCourseProgressContext(courseId, studentId)
  if (!ctx?.progress.isComplete) {
    return { completed: false, certificateIssued: false }
  }

  const admin = createAdminClient()

  const { data: enrollment } = await admin
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!enrollment) {
    return { completed: false, certificateIssued: false }
  }

  await admin.from('course_completions').upsert(
    {
      student_id: studentId,
      course_id: courseId,
      progress_percent: ctx.progress.progressPercent,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,course_id' }
  )

  revalidatePath(`/${locale}/dashboard/my-courses`)
  revalidatePath(`/${locale}/dashboard/my-learning`)
  revalidatePath(`/${locale}/dashboard/certificates`)

  if (!ctx.course.certificate_enabled) {
    return { completed: true, certificateIssued: false }
  }

  if (ctx.course.final_exam_required) {
    return { completed: true, certificateIssued: false }
  }

  const issued = await issueCertificate(studentId, courseId, 'auto_completion', locale)
  return { completed: true, certificateIssued: issued }
}

export async function issueCertificate(
  studentId: string,
  courseId: string,
  issuedVia: CertificateIssuedVia,
  locale: string
): Promise<boolean> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('certificates')
    .select('id')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existing) return false

  const { data: student } = await admin
    .from('users')
    .select('full_name, full_name_ar')
    .eq('id', studentId)
    .single()

  const { data: course } = await admin
    .from('courses')
    .select('title, title_ar, instructor_id, instructor:users(full_name, full_name_ar)')
    .eq('id', courseId)
    .single()

  if (!student || !course) return false

  const instructorRaw = course.instructor
  const instructor = Array.isArray(instructorRaw) ? instructorRaw[0] : instructorRaw
  if (!instructor) return false

  let verificationCode = generateVerificationCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await admin.from('certificates').insert({
      verification_code: verificationCode,
      student_id: studentId,
      course_id: courseId,
      student_name: student.full_name,
      student_name_ar: student.full_name_ar,
      course_title: course.title,
      course_title_ar: course.title_ar,
      instructor_name: instructor.full_name,
      instructor_name_ar: instructor.full_name_ar,
      issued_via: issuedVia,
    })

    if (!error) {
      revalidatePath(`/${locale}/dashboard/certificates`)
      revalidatePath(`/${locale}/dashboard/profile`)
      revalidatePath(`/${locale}/certificate/${verificationCode}`)
      return true
    }

    if (error.code === '23505') {
      if (error.message.includes('verification_code')) {
        verificationCode = generateVerificationCode()
        continue
      }
      return false
    }
    return false
  }

  return false
}

export async function verifyStudentEnrollment(
  studentId: string,
  courseId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle()
  return Boolean(data)
}

export async function isCourseFullyComplete(
  studentId: string,
  courseId: string
): Promise<boolean> {
  const ctx = await getCourseProgressContext(courseId, studentId)
  return Boolean(ctx?.progress.isComplete)
}
