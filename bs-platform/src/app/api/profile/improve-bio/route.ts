import { NextResponse } from 'next/server'
import { editWithCvBuilder, isCvBuilderConfigured } from '@/lib/profile/cv-builder-api'
import { improveBioSchema } from '@/lib/profile/profile-schemas'
import { getAuthenticatedUserId } from '@/lib/profile/get-user-profile'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rate = await checkDurableRateLimit({
    key: `profile:improve-bio:user:${userId}`,
    max: 20,
    windowSeconds: 60,
  })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  if (!isCvBuilderConfigured()) {
    return NextResponse.json({ error: 'cv_builder_not_configured' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = improveBioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const { bio, headline, skills, experience } = parsed.data

  const result = await editWithCvBuilder({
    instruction:
      'Improve this professional bio/summary. Keep it concise, professional, and in the same language as the input. Use clear sentences suitable for a job platform profile.',
    content: bio,
    context: { headline, skills, experience },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status })
  }

  return NextResponse.json({ text: result.result })
}
