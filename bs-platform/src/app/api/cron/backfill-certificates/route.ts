import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { recordCourseCompletionIfEligible } from '@/lib/certificates/completion-actions'

/**
 * Report BS-29: certificates were never issued because `certificate_enabled`
 * defaulted to false. Migration 083 turns it on; this sweep issues the
 * certificates that should already exist for students who finished a course
 * before the fix.
 *
 * Re-entrant: recordCourseCompletionIfEligible() checks progress, upserts the
 * completion row and de-dupes the certificate, so running it repeatedly is safe.
 */
const BATCH_LIMIT = 500

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // Enrollments that do not yet have a certificate for the same course.
    const { data: enrollments, error } = await admin
      .from('enrollments')
      .select('student_id, course_id')
      .limit(BATCH_LIMIT)

    if (error) {
      console.error('[cron/backfill-certificates]', error.message)
      return NextResponse.json({ error: 'query_failed' }, { status: 500 })
    }

    const { data: existing } = await admin.from('certificates').select('student_id, course_id')
    const have = new Set((existing ?? []).map((c) => `${c.student_id}:${c.course_id}`))

    const pending = (enrollments ?? []).filter(
      (e) => !have.has(`${e.student_id}:${e.course_id}`)
    )

    let issued = 0
    let completed = 0
    for (const e of pending) {
      try {
        const res = await recordCourseCompletionIfEligible(
          e.student_id as string,
          e.course_id as string,
          'ar'
        )
        if (res.completed) completed += 1
        if (res.certificateIssued) issued += 1
      } catch (err) {
        console.error('[cron/backfill-certificates] row failed', e.course_id, err)
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: pending.length,
      completed,
      issued,
    })
  } catch (err) {
    console.error('[cron/backfill-certificates]', err)
    return NextResponse.json({ error: 'backfill_failed' }, { status: 500 })
  }
}
