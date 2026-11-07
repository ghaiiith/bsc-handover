import { NextResponse } from 'next/server'
import { generateQuizFromContentRequestSchema } from '@/lib/instructor/ai/course-ai-schemas'
import { generateQuizFromContentWithAi } from '@/lib/instructor/ai/course-ai-service'
import { getInstructorApiUserId } from '@/lib/instructor/verify-instructor-api'
import { checkProAccess } from '@/lib/subscription/pro-access'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'

// Report BS-77: generate quizzes ONLY, from content the instructor provides.
export async function POST(request: Request) {
  const userId = await getInstructorApiUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const proAccess = await checkProAccess(userId, 'ai_course')
  if (!proAccess.allowed) {
    return NextResponse.json({ error: 'pro_required', feature: proAccess.feature }, { status: 402 })
  }

  const rate = await checkDurableRateLimit({
    key: `instructor:ai:quiz-from-content:user:${userId}`,
    max: 15,
    windowSeconds: 60,
  })
  if (!rate.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = generateQuizFromContentRequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })

  const result = await generateQuizFromContentWithAi(parsed.data)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status })
  }
  return NextResponse.json(result.data)
}
