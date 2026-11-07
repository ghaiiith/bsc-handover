import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface StudioAdminContext {
  userId: string
  accessToken: string
  supabase: SupabaseClient
}

/** Admin-only access for BS Platform Studio (Bearer JWT). Does not use cookies. */
export async function verifyStudioAdmin(
  request: Request
): Promise<StudioAdminContext | null> {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null

  const accessToken = header.slice('Bearer '.length).trim()
  if (!accessToken) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin' || profile?.is_active === false) return null

  return { userId: user.id, accessToken, supabase }
}
