import { redirect } from 'next/navigation'
import { getPersonalizedHomePath } from '@/lib/auth/personalized-home'
import { createClient } from '@/lib/supabase/server'
import type { User, UserRole } from '@/types'

export interface InstructorAccess {
  userId: string
  profile: User
  role: UserRole
}

export async function requireInstructorAccess(
  locale: string
): Promise<InstructorAccess> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: rpcData } = await supabase.rpc('get_my_profile')
  const profile = Array.isArray(rpcData) ? rpcData[0] : rpcData

  if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin') || profile.is_active === false) {
    redirect(getPersonalizedHomePath(locale))
  }

  return {
    userId: user.id,
    profile: profile as User,
    role: profile.role as UserRole,
  }
}
