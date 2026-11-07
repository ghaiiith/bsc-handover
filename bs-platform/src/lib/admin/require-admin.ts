import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPersonalizedHomePath } from '@/lib/auth/personalized-home'
import type { User } from '@/types'

export interface AdminAccess {
  userId: string
  profile: User
}

export async function requireAdminAccess(locale: string): Promise<AdminAccess> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: rpcData } = await supabase.rpc('get_my_profile')
  const profile = Array.isArray(rpcData) ? rpcData[0] : rpcData

  if (!profile || profile.role !== 'admin' || profile.is_active === false) {
    redirect(getPersonalizedHomePath(locale))
  }

  return {
    userId: user.id,
    profile: profile as User,
  }
}
