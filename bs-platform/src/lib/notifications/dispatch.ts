import { createAdminClient } from '@/lib/supabase/admin'
import type { CreateNotificationInput } from '@/lib/notifications'
import { sendPushToUser } from '@/lib/push/send-push'

export async function dispatchNotificationPush(
  input: CreateNotificationInput,
  options?: { isAdmin?: boolean }
): Promise<void> {
  await sendPushToUser({
    userId: input.userId,
    title: input.title,
    titleAr: input.titleAr,
    body: input.body,
    bodyAr: input.bodyAr,
    type: input.type,
    isAdmin: options?.isAdmin,
  })
}

export async function dispatchNotificationsPush(
  inputs: CreateNotificationInput[],
  options?: { isAdmin?: boolean }
): Promise<void> {
  await Promise.allSettled(
    inputs.map((input) => dispatchNotificationPush(input, options))
  )
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role === 'admin'
}
