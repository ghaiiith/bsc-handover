import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'
import {
  assistantChat,
  isLearningAssistantConfigured,
} from '@/lib/ai/learning-assistant-server'
import {
  buildAssistantStudent,
  getAssistantCatalog,
  getAssistantJobs,
} from '@/lib/ai/learning-assistant-data'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  locale: z.enum(['ar', 'en']).optional().default('ar'),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(20)
    .optional(),
  page: z
    .object({
      path: z.string().max(300).optional(),
      title: z.string().max(200).optional(),
      section: z.string().max(120).optional(),
    })
    .optional(),
})

// Integration: the student-facing Computiq learning_assistant — recommends real
// courses + jobs from the platform catalog and writes a page-aware reply.
export async function POST(request: Request) {
  if (!isLearningAssistantConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const rate = await checkDurableRateLimit({
    key: `assistant:chat:user:${user.id}`,
    max: 30,
    windowSeconds: 60,
  })
  if (!rate.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })

  const { message, locale, history, page } = parsed.data
  const [student, catalog, jobs] = await Promise.all([
    buildAssistantStudent(user.id),
    getAssistantCatalog(locale),
    getAssistantJobs(locale),
  ])

  const result = await assistantChat({ message, student, catalog, jobs, history, page, locale })
  if (!result) return NextResponse.json({ error: 'assistant_unavailable' }, { status: 502 })

  return NextResponse.json(result)
}
