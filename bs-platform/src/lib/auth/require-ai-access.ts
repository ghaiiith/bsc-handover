import { createClient } from '@/lib/supabase/server'
import { canAccessAiFeatures, canUseAiChat } from '@/lib/auth/role-capabilities'
import type { UserRole } from '@/types'

export type AiAccessResult =
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; reason: 'unauthorized' | 'forbidden' }

/**
 * `capability` picks the gate: 'chat' is open to every signed-in role, 'tools'
 * keeps the privileged-role restriction. Defaults to 'tools' so existing
 * callers keep their behaviour.
 */
export async function requireAiAccess(
  capability: 'chat' | 'tools' = 'tools'
): Promise<AiAccessResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, reason: 'unauthorized' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = (profile?.role ?? 'student') as UserRole
  const allowed = capability === 'chat' ? canUseAiChat(role) : canAccessAiFeatures(role)
  if (!allowed) {
    return { ok: false, reason: 'forbidden' }
  }

  return { ok: true, userId: user.id, role }
}
