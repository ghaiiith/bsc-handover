import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { CVProfile } from '@/types/cv'

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function listCvProfiles(userId: string): Promise<CVProfile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cv_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return data as CVProfile[]
}

export async function getCvProfile(
  profileId: string,
  userId: string
): Promise<CVProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cv_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as CVProfile
}

export async function countCvProfiles(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('cv_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}

export async function getUserForCvImport(userId: string) {
  // userId is always the session user; own-row PII is served by get_my_profile (044).
  void userId
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_my_profile')
  return Array.isArray(data) ? data[0] : data
}

export async function getDefaultCvProfile(userId: string): Promise<CVProfile | null> {
  const profiles = await listCvProfiles(userId)
  if (!profiles.length) return null
  return profiles.find((p) => p.is_default) ?? profiles[0]
}
