import { createClient } from '@/lib/supabase/server'

export async function verifyAdminApi(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' && profile?.is_active !== false
}
