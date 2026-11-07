import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSignedExamUrl } from '@/lib/certificates/enrollment-cert-status'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  const type = searchParams.get('type')
  const submissionId = searchParams.get('submissionId')

  if (!courseId || (type !== 'material' && type !== 'answer')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id, final_exam_pdf_path')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (type === 'material') {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()

    const isInstructor = course.instructor_id === user.id
    if (!enrollment && !isInstructor) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    if (!course.final_exam_pdf_path) {
      return NextResponse.json({ error: 'no_exam_pdf' }, { status: 404 })
    }

    const url = await createSignedExamUrl('final-exam-materials', course.final_exam_pdf_path)
    if (!url) return NextResponse.json({ error: 'sign_failed' }, { status: 500 })
    return NextResponse.json({ url })
  }

  if (!submissionId) {
    return NextResponse.json({ error: 'missing_submission' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: submission } = await admin
    .from('final_exam_submissions')
    .select('answer_pdf_path, student_id, course_id')
    .eq('id', submissionId)
    .eq('course_id', courseId)
    .single()

  if (!submission) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const isInstructor = course.instructor_id === user.id
  const isOwner = submission.student_id === user.id
  if (!isInstructor && !isOwner) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = await createSignedExamUrl(
    'final-exam-submissions',
    submission.answer_pdf_path
  )
  if (!url) return NextResponse.json({ error: 'sign_failed' }, { status: 500 })
  return NextResponse.json({ url })
}
