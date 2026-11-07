import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { globalSearch } from '@/lib/search/global-search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const locale = searchParams.get('locale') ?? 'en'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    role = profile?.role as string | undefined
  }

  const data = await globalSearch(q, locale, user?.id, role)
  return NextResponse.json(data)
}
