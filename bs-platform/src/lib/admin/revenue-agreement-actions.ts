'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { NotificationKind } from '@/lib/notifications/types'
import {
  deactivateRevenueAgreement,
  getAgreementHistory,
  replaceRevenueAgreement,
} from '@/lib/revenue/agreements'

async function verifyAdmin(): Promise<{ ok: true; userId: string } | { ok: false }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { ok: false }
  return { ok: true, userId: user.id }
}

export interface RevenueAgreementActionResult {
  success?: boolean
  error?: string
}

export async function createOrReplaceRevenueAgreement(
  instructorId: string,
  platformPercentage: number,
  instructorPercentage: number,
  notes: string | null,
  locale: string
): Promise<RevenueAgreementActionResult> {
  const auth = await verifyAdmin()
  if (!auth.ok) return { error: 'unauthorized' }

  const result = await replaceRevenueAgreement({
    instructorId,
    platformPercentage,
    instructorPercentage,
    createdBy: auth.userId,
    notes,
  })

  if (!result.agreement) return { error: result.error ?? 'create_failed' }

  await createNotification({
    userId: instructorId,
    type: NotificationKind.commissionUpdated,
    title: 'Your revenue agreement was updated',
    titleAr: 'تم تحديث اتفاقية أرباحك',
    body: `Platform ${result.agreement.platform_percentage}% / Instructor ${result.agreement.instructor_percentage}%. Effective immediately for new sales.`,
    bodyAr: `المنصة ${result.agreement.platform_percentage}% / المدرب ${result.agreement.instructor_percentage}%. تُطبَّق على المبيعات الجديدة.`,
  })

  revalidatePath(`/${locale}/admin/revenue-commission`)
  revalidatePath(`/${locale}/admin/discounts`)
  revalidatePath(`/${locale}/instructor/earnings`)

  return { success: true }
}

export async function archiveRevenueAgreement(
  instructorId: string,
  locale: string
): Promise<RevenueAgreementActionResult> {
  const auth = await verifyAdmin()
  if (!auth.ok) return { error: 'unauthorized' }

  const result = await deactivateRevenueAgreement(instructorId, auth.userId)
  if (!result.success) return { error: result.error ?? 'deactivate_failed' }

  revalidatePath(`/${locale}/admin/revenue-commission`)
  return { success: true }
}

export async function fetchAgreementHistory(instructorId: string) {
  const auth = await verifyAdmin()
  if (!auth.ok) return []

  return getAgreementHistory(instructorId)
}

/** @deprecated Use createOrReplaceRevenueAgreement */
export async function updateInstructorCommission(
  instructorId: string,
  instructorPct: number | null,
  locale: string
): Promise<RevenueAgreementActionResult> {
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
