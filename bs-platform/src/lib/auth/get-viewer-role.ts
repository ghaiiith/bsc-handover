import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export async function getViewerRole(): Promise<{
  userId: string | null
  role: UserRole | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { userId: null, role: null }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role as UserRole | undefined
  return { userId: user.id, role: role ?? 'student' }
}
