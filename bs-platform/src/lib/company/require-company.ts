import { redirect } from 'next/navigation'
import { getPersonalizedHomePath } from '@/lib/auth/personalized-home'
import { createClient } from '@/lib/supabase/server'

export async function requireCompanyRep(locale: string): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/login`)

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'company') redirect(getPersonalizedHomePath(locale))

  return user.id
}
