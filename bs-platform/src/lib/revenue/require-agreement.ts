import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { ensureActiveRevenueAgreement } from '@/lib/revenue/agreements'

export const NO_REVENUE_AGREEMENT_ERROR = 'no_revenue_agreement'

export async function requireInstructorRevenueAgreement(
  instructorId: string
): Promise<{ ok: true; agreementId: string } | { ok: false; error: typeof NO_REVENUE_AGREEMENT_ERROR }> {
  // Report BS-55: auto-provision the platform-default agreement when none is set
  // so a paid course is never blocked from selling. Only a hard failure to
  // create/read one (infra error) falls through as no_revenue_agreement.
  try {
    const agreement = await ensureActiveRevenueAgreement(instructorId)
    return { ok: true, agreementId: agreement.id }
  } catch {
    return { ok: false, error: NO_REVENUE_AGREEMENT_ERROR }
  }
}

export async function requireCourseRevenueAgreement(
  courseId: string
): Promise<
  | { ok: true; instructorId: string; agreementId: string }
  | { ok: false; error: typeof NO_REVENUE_AGREEMENT_ERROR | 'course_not_found' }
> {
  const admin = createAdminClient()
  const { data: course } = await admin
    .from('courses')
    .select('instructor_id, price')
    .eq('id', courseId)
    .maybeSingle()

  if (!course?.instructor_id) {
    return { ok: false, error: 'course_not_found' }
  }

  const check = await requireInstructorRevenueAgreement(course.instructor_id)
  if (!check.ok) return check

  return {
    ok: true,
    instructorId: course.instructor_id,
    agreementId: check.agreementId,
  }
}

/** Paid courses require an active revenue agreement before publish/checkout. */
export async function requirePaidCourseRevenueAgreement(
  courseId: string,
  price: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (price <= 0) return { ok: true }
  const result = await requireCourseRevenueAgreement(courseId)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true }
}
