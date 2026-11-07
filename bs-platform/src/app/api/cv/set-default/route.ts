import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'

const schema = z.object({ profileId: z.string().uuid() })

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })

  const supabase = await createClient()
  await supabase.from('cv_profiles').update({ is_default: false }).eq('user_id', userId)

  const { error } = await supabase
    .from('cv_profiles')
    .update({ is_default: true })
    .eq('id', parsed.data.profileId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
