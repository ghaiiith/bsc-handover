import { createClient } from '@/lib/supabase/server'

export async function verifyInstructorApi(): Promise<boolean> {
  return (await getInstructorApiUserId()) !== null
}

/**
 * Like `verifyInstructorApi` but returns the authenticated user's id when they
 * are an instructor/admin (else `null`). Useful for per-user rate limiting.
 */
export async function getInstructorApiUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  const isInstructor =
    (profile?.role === 'instructor' || profile?.role === 'admin') &&
    profile?.is_active !== false
  return isInstructor ? user.id : null
}
