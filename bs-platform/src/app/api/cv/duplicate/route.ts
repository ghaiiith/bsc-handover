import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MAX_CV_PROFILES } from '@/lib/cv/constants'
import { countCvProfiles, getAuthenticatedUserId, getCvProfile } from '@/lib/cv/cv-data'

const schema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
})

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })

  const source = await getCvProfile(parsed.data.profileId, userId)
  if (!source) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const count = await countCvProfiles(userId)
  if (count >= MAX_CV_PROFILES) {
    return NextResponse.json({ error: 'max_cvs_reached' }, { status: 400 })
  }

  const supabase = await createClient()
  const copyName = parsed.data.name ?? `Copy of ${source.name}`

  const { data, error } = await supabase
    .from('cv_profiles')
    .insert({
      user_id: userId,
      name: copyName,
      resume_data: source.resume_data,
      selected_template: source.selected_template,
      language: source.language,
      is_default: false,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
