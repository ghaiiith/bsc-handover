import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'

export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profile_id_required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('cv_profiles')
    .delete()
    .eq('id', profileId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
