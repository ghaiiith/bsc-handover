import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AgreementWithInstructor,
  InstructorRevenueAgreement,
} from '@/lib/revenue/types'
import { roundPercentage } from '@/lib/revenue/money'

function mapAgreement(row: Record<string, unknown>): InstructorRevenueAgreement {
  return {
    id: row.id as string,
    instructor_id: row.instructor_id as string,
    platform_percentage: Number(row.platform_percentage),
    instructor_percentage: Number(row.instructor_percentage),
    effective_date: row.effective_date as string,
    status: row.status as InstructorRevenueAgreement['status'],
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function getActiveRevenueAgreement(
  instructorId: string
): Promise<InstructorRevenueAgreement | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('instructor_revenue_agreements')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('status', 'active')
    .maybeSingle()

  return data ? mapAgreement(data) : null
}

export async function hasActiveRevenueAgreement(instructorId: string): Promise<boolean> {
  const agreement = await getActiveRevenueAgreement(instructorId)
  return agreement !== null
}

/**
 * Report BS-55: return the instructor's active agreement, creating one from the
 * platform default split if none exists. Used on the money paths (course
 * checkout gate, payout snapshot) that need a real, FK-valid agreement id — so
 * an instructor without an admin-set custom agreement is still credited at the
 * platform default (e.g. 70%) instead of blocking the sale with
 * `no_revenue_agreement`. A partial unique index guarantees one active agreement
 * per instructor, so a concurrent insert simply loses the race and we re-read.
 */
export async function ensureActiveRevenueAgreement(
  instructorId: string
): Promise<InstructorRevenueAgreement> {
  const existing = await getActiveRevenueAgreement(instructorId)
  if (existing) return existing

  const { getDefaultCommissionSplit } = await import('@/lib/admin/platform-settings')
  const split = await getDefaultCommissionSplit()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('instructor_revenue_agreements')
    .insert({
      instructor_id: instructorId,
      platform_percentage: split.adminPct,
      instructor_percentage: split.instructorPct,
      status: 'active',
      notes: 'Auto-provisioned from platform default commission (BS-55)',
    })
    .select('*')
    .single()

  if (error) {
    // Lost the unique-index race (another request just created it) — re-read.
    const again = await getActiveRevenueAgreement(instructorId)
    if (again) return again
    throw error
  }

  return mapAgreement(data)
}

export async function getAgreementHistory(
  instructorId: string
): Promise<InstructorRevenueAgreement[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('instructor_revenue_agreements')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false })

  return (data ?? []).map(mapAgreement)
}

export async function listActiveAgreementsWithInstructors(): Promise<
  AgreementWithInstructor[]
> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('instructor_revenue_agreements')
    .select(
      `
      *,
      instructor:users!instructor_revenue_agreements_instructor_id_fkey(
        full_name, full_name_ar, email
      )
    `
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (data ?? []).map((row) => {
    const agreement = mapAgreement(row)
    const instructor = row.instructor as {
      full_name: string
      full_name_ar: string | null
      email: string
    } | null
    return {
      ...agreement,
      instructor_name: instructor?.full_name ?? '—',
      instructor_name_ar: instructor?.full_name_ar ?? null,
      instructor_email: instructor?.email ?? '—',
    }
  })
}

export interface CreateAgreementInput {
  instructorId: string
  platformPercentage: number
  instructorPercentage: number
  createdBy: string
  notes?: string | null
  effectiveDate?: string
}

function validateSplit(platformPct: number, instructorPct: number): string | null {
  const p = roundPercentage(platformPct)
  const i = roundPercentage(instructorPct)
  if (p < 0 || p > 100 || i < 0 || i > 100) return 'invalid_percentage'
  if (p + i !== 100) return 'split_must_equal_100'
  return null
}

/** Archive current active agreement and create a new one atomically. */
export async function replaceRevenueAgreement(
  input: CreateAgreementInput
): Promise<{ agreement: InstructorRevenueAgreement | null; error?: string }> {
  const validationError = validateSplit(
    input.platformPercentage,
    input.instructorPercentage
  )
  if (validationError) return { agreement: null, error: validationError }

  const admin = createAdminClient()

  const { data: instructor } = await admin
    .from('users')
    .select('id, role')
    .eq('id', input.instructorId)
    .maybeSingle()

  if (!instructor || instructor.role !== 'instructor') {
    return { agreement: null, error: 'instructor_not_found' }
  }

  await admin
    .from('instructor_revenue_agreements')
    .update({
      status: 'archived',
      updated_by: input.createdBy,
      updated_at: new Date().toISOString(),
    })
    .eq('instructor_id', input.instructorId)
    .eq('status', 'active')

  const { data, error } = await admin
    .from('instructor_revenue_agreements')
    .insert({
      instructor_id: input.instructorId,
      platform_percentage: roundPercentage(input.platformPercentage),
      instructor_percentage: roundPercentage(input.instructorPercentage),
      effective_date: input.effectiveDate ?? new Date().toISOString(),
      status: 'active',
      created_by: input.createdBy,
      updated_by: input.createdBy,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error || !data) return { agreement: null, error: 'create_failed' }

  // Keep legacy column in sync for read-only tooling (not used for calculations)
  await admin
    .from('users')
    .update({ commission_instructor_pct: roundPercentage(input.instructorPercentage) })
    .eq('id', input.instructorId)

  return { agreement: mapAgreement(data) }
}

export async function deactivateRevenueAgreement(
  instructorId: string,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('instructor_revenue_agreements')
    .update({
      status: 'archived',
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('instructor_id', instructorId)
    .eq('status', 'active')

  if (error) return { success: false, error: 'deactivate_failed' }

  await admin
    .from('users')
    .update({ commission_instructor_pct: null })
    .eq('id', instructorId)

  return { success: true }
}

export async function getActiveAgreementsForInstructors(
  instructorIds: string[]
): Promise<Map<string, InstructorRevenueAgreement>> {
  const map = new Map<string, InstructorRevenueAgreement>()
  const unique = [...new Set(instructorIds.filter(Boolean))]
  if (unique.length === 0) return map

  const admin = createAdminClient()
  const { data } = await admin
    .from('instructor_revenue_agreements')
    .select('*')
    .in('instructor_id', unique)
    .eq('status', 'active')

  for (const row of data ?? []) {
    const agreement = mapAgreement(row)
    map.set(agreement.instructor_id, agreement)
  }
  return map
}
