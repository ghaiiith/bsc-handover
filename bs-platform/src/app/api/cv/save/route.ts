import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MAX_CV_PROFILES } from '@/lib/cv/constants'
import { formDataToResumeInput } from '@/lib/cv/mappers'
import { countCvProfiles, getAuthenticatedUserId } from '@/lib/cv/cv-data'
import type { CVFormData, ResumeInput } from '@/types/cv'

const saveSchema = z.object({
  profileId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  resumeData: z.custom<ResumeInput>(),
  selectedTemplate: z.string().min(1),
  language: z.enum(['ar', 'en']),
  isDefault: z.boolean(),
})

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const { profileId, name, resumeData, selectedTemplate, language, isDefault } = parsed.data
  const supabase = await createClient()

  if (isDefault) {
    await supabase
      .from('cv_profiles')
      .update({ is_default: false })
      .eq('user_id', userId)
  }

  if (profileId) {
    const { data, error } = await supabase
      .from('cv_profiles')
      .update({
        name,
        resume_data: resumeData,
        selected_template: selectedTemplate,
        language,
        is_default: isDefault,
      })
      .eq('id', profileId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profileId: data.id, savedAt: data.updated_at, profile: data })
  }

  const count = await countCvProfiles(userId)
  if (count >= MAX_CV_PROFILES) {
    return NextResponse.json({ error: 'max_cvs_reached' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cv_profiles')
    .insert({
      user_id: userId,
      name,
      resume_data: resumeData,
      selected_template: selectedTemplate,
      language,
      is_default: isDefault,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profileId: data.id, savedAt: data.updated_at, profile: data })
}

/** Accept CVFormData from client and convert server-side */
export async function PUT(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const formSchema = z.object({
    profileId: z.string().uuid().optional(),
    formData: z.custom<CVFormData>(),
  })

  const parsed = formSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const { profileId, formData } = parsed.data
  const resumeData = formDataToResumeInput(formData)

  const saveRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      name: formData.settings.name,
      resumeData,
      selectedTemplate: formData.settings.selectedTemplate,
      language: formData.settings.language,
      isDefault: formData.settings.isDefault,
    }),
  })

  return POST(saveRequest)
}
