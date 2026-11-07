'use server'

import { revalidatePath } from 'next/cache'
import { revalidateCoursesListingCache } from '@/lib/cache/invalidate-listing-cache'
import { after } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAndEmail } from '@/lib/notify'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'
import { getAppUrl } from '@/lib/seo/metadata'
import {
  buildCourseApprovedEmail,
  buildCourseRejectedEmail,
} from '@/lib/email/templates'
import { requirePaidCourseRevenueAgreement } from '@/lib/revenue/require-agreement'

const rejectSchema = z.object({
  courseId: z.string().uuid(),
  reason: z.string().min(10, 'reason_min'),
  locale: z.string().min(2),
})

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

function revalidateCoursePaths(locale: string, courseId: string) {
  revalidateCoursesListingCache()
  revalidatePath(`/${locale}/admin/courses`)
  revalidatePath(`/${locale}/courses`)
  revalidatePath(`/${locale}/courses/${courseId}`)
  revalidatePath(`/${locale}/instructor/courses`)
}

export async function approveCourse(
  courseId: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) {
    return { error: 'unauthorized' }
  }

  const admin = createAdminClient()

  const { data: course } = await admin
    .from('courses')
    .select('id, title, title_ar, instructor_id, price, instructor:users(email)')
    .eq('id', courseId)
    .single()

  if (!course) {
    return { error: 'course_not_found' }
  }

  const agreementCheck = await requirePaidCourseRevenueAgreement(
    courseId,
    Number(course.price)
  )
  if (!agreementCheck.ok) {
    return { error: agreementCheck.error }
  }

  const { error } = await admin
    .from('courses')
    .update({
      status: 'published',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)

  if (error) {
    return { error: error.message }
  }

  await admin
    .from('courses')
    .update({ visibility: 'published' })
    .eq('id', courseId)

  if (course?.instructor_id) {
    const instructor = Array.isArray(course.instructor)
      ? course.instructor[0]
      : course.instructor
    const appUrl = getAppUrl()
    const courseUrl = `${appUrl}/${locale}/courses/${courseId}`

    after(() =>
      notifyAndEmail(
        {
          userId: course.instructor_id,
          title: 'Course published',
          titleAr: `تم نشر كورسك ${course.title_ar}!`,
          body: `Your course "${course.title}" is now live.`,
          bodyAr: `تم نشر كورسك "${course.title_ar}" بنجاح!`,
          type: `course_approved:${courseId}`,
        },
        instructor?.email
          ? {
              to: instructor.email,
              ...buildCourseApprovedEmail({
                courseTitle: course.title_ar,
                courseUrl,
              }),
            }
          : null
      )
    )
  }

  revalidateCoursePaths(locale, courseId)
  return { success: true }
}

export async function rejectCourse(
  courseId: string,
  reason: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const parsed = rejectSchema.safeParse({ courseId, reason, locale })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'invalid_input' }
  }

  if (!(await verifyAdmin())) {
    return { error: 'unauthorized' }
  }

  const admin = createAdminClient()

  const { data: course } = await admin
    .from('courses')
    .select('id, title, title_ar, instructor_id, instructor:users(email)')
    .eq('id', courseId)
    .single()

  const { error } = await admin
    .from('courses')
    .update({
      status: 'rejected',
      rejection_reason: parsed.data.reason.trim(),
      rejection_note: parsed.data.reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)

  if (error) {
    return { error: error.message }
  }

  if (course?.instructor_id) {
    const instructor = Array.isArray(course.instructor)
      ? course.instructor[0]
      : course.instructor
    const appUrl = getAppUrl()

    after(() =>
      notifyAndEmail(
        {
          userId: course.instructor_id,
          title: 'Course rejected',
          titleAr: `تحديث بخصوص كورسك ${course.title_ar}`,
          body: `Your course was rejected. Reason: ${parsed.data.reason.trim()}`,
          bodyAr: `تم رفض كورسك "${course.title_ar}". السبب: ${parsed.data.reason.trim()}`,
          type: `course_rejected:${courseId}`,
        },
        instructor?.email
          ? {
              to: instructor.email,
              ...buildCourseRejectedEmail({
                courseTitle: course.title_ar,
                rejectionNote: parsed.data.reason.trim(),
                editUrl: `${appUrl}/${locale}/instructor/courses/${courseId}/studio/settings`,
              }),
            }
          : null
      )
    )
  }

  revalidateCoursePaths(locale, courseId)
  return { success: true }
}

export async function unpublishCourse(
  courseId: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) {
    return { error: 'unauthorized' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('courses')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)

  if (error) {
    return { error: error.message }
  }

  revalidateCoursePaths(locale, courseId)
  return { success: true }
}

/**
 * Report BS-78: the admin sets a per-course platform-commission %. Passing null
 * clears the override so the course falls back to the instructor agreement /
 * platform default. The value is the PLATFORM share on the net amount (after
 * gateway fees); the instructor keeps 100 - this.
 */
export async function setCourseCommission(
  courseId: string,
  platformPct: number | null,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  if (platformPct !== null && (!Number.isFinite(platformPct) || platformPct < 0 || platformPct > 100)) {
    return { error: 'invalid_percentage' }
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('courses')
    .update({ platform_commission_pct: platformPct, updated_at: new Date().toISOString() })
    .eq('id', courseId)
  if (error) return { error: error.message }
  revalidateCoursePaths(locale, courseId)
  return { success: true }
}

/**
 * Report BS-75: pending course EDITS awaiting admin approval (published courses
 * whose owner changed course-level fields). Mirrors the BS-53 job-edit queue.
 */
export async function getPendingCourseEdits() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('courses')
    .select('id, title, title_ar, price, pending_changes, pending_submitted_at, instructor:users(full_name, full_name_ar)')
    .eq('pending_review_status', 'pending')
    .order('pending_submitted_at', { ascending: true })
  return data ?? []
}

/** Apply a pending course edit onto the live row and clear the pending state. */
export async function approveCourseEdit(
  courseId: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const admin = createAdminClient()
  const { data: course } = await admin
    .from('courses')
    .select('pending_changes, instructor_id, title, title_ar')
    .eq('id', courseId)
    .maybeSingle()
  const changes = (course?.pending_changes as Record<string, unknown> | null) ?? {}

  const { error } = await admin
    .from('courses')
    .update({
      ...changes,
      pending_changes: null,
      pending_review_status: 'none',
      pending_rejection_reason: null,
      pending_submitted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
  if (error) return { error: error.message }

  // Report BS-75: tell the trainer their change is now live.
  if (course?.instructor_id) {
    void notifyAndEmail({
      userId: course.instructor_id as string,
      title: 'Course change approved',
      titleAr: 'تمت الموافقة على تعديل الدورة',
      body: `Your changes to "${course.title}" are now live.`,
      bodyAr: `تعديلاتك على "${course.title_ar ?? course.title}" صارت منشورة.`,
      type: buildNotificationType(NotificationKind.courseEditApproved, courseId),
    })
  }

  revalidateCoursePaths(locale, courseId)
  return { success: true }
}

/** Reject a pending course edit — discard the changes, keep the live version. */
export async function rejectCourseEdit(
  courseId: string,
  reason: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const admin = createAdminClient()
  const { data: course } = await admin
    .from('courses')
    .select('instructor_id, title, title_ar')
    .eq('id', courseId)
    .maybeSingle()

  const { error } = await admin
    .from('courses')
    .update({
      pending_changes: null,
      pending_review_status: 'rejected',
      pending_rejection_reason: reason.trim().slice(0, 500) || null,
    })
    .eq('id', courseId)
    .eq('pending_review_status', 'pending')
  if (error) return { error: error.message }

  // Report BS-75: tell the trainer it was rejected AND why.
  if (course?.instructor_id) {
    const why = reason.trim().slice(0, 300)
    void notifyAndEmail({
      userId: course.instructor_id as string,
      title: 'Course change rejected',
      titleAr: 'تم رفض تعديل الدورة',
      body: `Your changes to "${course.title}" were not approved. Reason: ${why}`,
      bodyAr: `لم تتم الموافقة على تعديلاتك على "${course.title_ar ?? course.title}". السبب: ${why}`,
      type: buildNotificationType(NotificationKind.courseEditRejected, courseId),
    })
  }

  revalidateCoursePaths(locale, courseId)
  return { success: true }
}
