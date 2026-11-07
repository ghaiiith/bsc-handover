'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAllAdmins } from '@/lib/admin/notify-admins'

export type ReportTargetType = 'course' | 'service' | 'job' | 'user' | 'review' | 'community'
export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'misleading'
  | 'scam'
  | 'harassment'
  | 'copyright'
  | 'other'
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

export interface ContentReport {
  id: string
  reporter_id: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  resolution_note: string | null
  created_at: string
  reporter: { full_name: string | null; full_name_ar: string | null } | null
}

export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  details?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'not_authenticated' }

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details?.trim().slice(0, 1000) || null,
  })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'already_reported' }
    return { success: false, error: error.message }
  }

  void notifyAllAdmins({
    title: 'New content report',
    titleAr: 'بلاغ محتوى جديد',
    body: `A ${targetType} was reported (${reason}).`,
    bodyAr: `تم الإبلاغ عن ${targetType} (${reason}).`,
    type: `content_report:${targetType}:${targetId}`,
  })

  return { success: true }
}

export async function getReports(status?: ReportStatus): Promise<ContentReport[]> {
  const admin = createAdminClient()
  let query = admin
    .from('content_reports')
    .select(
      'id, reporter_id, target_type, target_id, reason, details, status, resolution_note, created_at, reporter:users!reporter_id(full_name, full_name_ar)'
    )
    .order('created_at', { ascending: false })
    .limit(200)
  if (status) query = query.eq('status', status)

  const { data } = await query
  return ((data ?? []) as unknown as ContentReport[]).map((r) => ({
    ...r,
    reporter: Array.isArray(r.reporter) ? r.reporter[0] ?? null : r.reporter,
  }))
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  locale: string,
  resolutionNote?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'not_authenticated' }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { success: false, error: 'unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('content_reports')
    .update({
      status,
      resolution_note: resolutionNote?.trim() || null,
      resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null,
    })
    .eq('id', reportId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/${locale}/admin/reports`)
  return { success: true }
}

export async function getOpenReportsCount(): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('content_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')
  return count ?? 0
}
