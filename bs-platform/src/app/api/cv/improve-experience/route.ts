import { NextResponse } from 'next/server'
import { z } from 'zod'
import { editWithCvBuilder, isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'
import { checkProAccess } from '@/lib/subscription/pro-access'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'

const schema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string().optional(),
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
    key: `cv:improve-experience:user:${userId}`,
    max: 30,
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

  const { title, company, description } = parsed.data
  const result = await editWithCvBuilder({
    instruction:
      'Improve this work experience description with clear professional bullet points. Keep concise and impactful.',
    content: description ?? '',
    context: { title, company },
  })

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status })
  return NextResponse.json({ description: result.result })
}
