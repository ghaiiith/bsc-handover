import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/profile'

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // userId is always the session user here; PII columns (email/phone) are only
  // readable for the caller's own row via the get_my_profile RPC (migration 044).
  void userId
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_profile')

  const row = Array.isArray(data) ? data[0] : data
  if (error || !row) return null
  return row as UserProfile
}

export async function getProfileScoreFromDb(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_profile_score', {
    p_user_id: userId,
  })

  if (error || data == null) return 0
  return Number(data)
}
