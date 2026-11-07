import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'

const schema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1).max(200),
})

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cv_profiles')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.profileId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
