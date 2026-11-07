'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Update the signed-in user's display name (report BS-06).
 * public.users has no UPDATE grant for the authenticated role (self-escalation
 * lockdown), so the write goes through the service-role client scoped to the
 * verified user id.
 */
export async function updateDisplayName(
  fullName: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const trimmed = fullName.trim()
  if (trimmed.length < 2) return { error: 'name_too_short' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ full_name: trimmed })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // Keep the auth metadata display name in sync so it survives claim refreshes.
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...(user.user_metadata ?? {}), full_name: trimmed },
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
