'use server'

import {
  archiveRevenueAgreement,
  createOrReplaceRevenueAgreement,
  fetchAgreementHistory,
} from '@/lib/admin/revenue-agreement-actions'

export type { RevenueAgreementActionResult as UpdateInstructorCommissionResult } from '@/lib/admin/revenue-agreement-actions'

export { fetchAgreementHistory }

export async function updateInstructorCommission(
  instructorId: string,
  instructorPct: number | null,
  locale: string
) {
  if (instructorPct === null) {
    return archiveRevenueAgreement(instructorId, locale)
  }
  return createOrReplaceRevenueAgreement(
    instructorId,
    100 - instructorPct,
    instructorPct,
    null,
    locale
  )
}
