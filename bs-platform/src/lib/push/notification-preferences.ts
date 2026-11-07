import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface NotificationPreferences {
  push_enabled: boolean
  push_orders: boolean
  push_courses: boolean
  push_account: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  push_orders: true,
  push_courses: true,
  push_account: true,
}

function parseNotificationPreferences(raw: unknown): NotificationPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  const prefs = raw as Partial<NotificationPreferences>
  return {
    push_enabled: prefs.push_enabled ?? true,
    push_orders: prefs.push_orders ?? true,
    push_courses: prefs.push_courses ?? true,
    push_account: prefs.push_account ?? true,
  }
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle()

  const root = (data?.preferences ?? {}) as Record<string, unknown>
  return parseNotificationPreferences(root.notifications)
}

export function shouldSendPushForType(
  prefs: NotificationPreferences,
  type: string
): boolean {
  if (!prefs.push_enabled) return false

  const kind = type.split(':')[0]
  if (
    kind.startsWith('service_order') ||
    kind === 'imported_job'
  ) {
    return prefs.push_orders
  }

  if (
    kind === 'enrollment' ||
    kind === 'new_student' ||
    kind === 'course_approved' ||
    kind === 'course_rejected' ||
    kind === 'course_review' ||
    kind === 'course_edit'
  ) {
    return prefs.push_courses
  }

  return prefs.push_account
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('users')
    .select('preferences')
    .eq('id', userId)
    .single()

  const root = (row?.preferences ?? {}) as Record<string, unknown>
  const current = parseNotificationPreferences(root.notifications)
  const next = { ...current, ...patch }

  const { error } = await supabase
    .from('users')
    .update({
      preferences: {
        ...root,
        notifications: next,
      },
    })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
