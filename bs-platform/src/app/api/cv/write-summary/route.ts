import { NextResponse } from 'next/server'
import { z } from 'zod'
import { editWithCvBuilder, isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'
import { checkProAccess } from '@/lib/subscription/pro-access'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'

const schema = z.object({
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    description: z.string().optional(),
  })).optional(),
  skills: z.array(z.string()).optional(),
  headline: z.string().optional(),
})

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Report BS-49: AI CV features may be gated behind Pro (admin-configurable).
  const proAccess = await checkProAccess(userId, 'ai_cv')
  if (!proAccess.allowed) {
    return NextResponse.json({ error: 'pro_required', feature: proAccess.feature }, { status: 402 })
  }


  const rate = await checkDurableRateLimit({
    key: `cv:write-summary:user:${userId}`,
    max: 20,
    windowSeconds: 60,
  })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  if (!isCvBuilderConfigured()) {
    return NextResponse.json({ error: 'cv_builder_not_configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })

  const context = parsed.data
  const content = [
    context.headline ? `Headline: ${context.headline}` : '',
    ...(context.experience ?? []).map(
      (e) => `${e.title} at ${e.company}: ${e.description ?? ''}`
    ),
    context.skills?.length ? `Skills: ${context.skills.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const result = await editWithCvBuilder({
    instruction:
      'Write a concise professional CV summary (max 600 characters) based on this experience and skills. Use the same language as the input content.',
    content,
    context,
  })

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status })
  return NextResponse.json({ summary: result.result })
}
