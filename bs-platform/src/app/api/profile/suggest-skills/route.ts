import { NextResponse } from 'next/server'
import { editWithCvBuilder, isCvBuilderConfigured } from '@/lib/profile/cv-builder-api'
import { suggestSkillsSchema } from '@/lib/profile/profile-schemas'
import { requireAiAccess } from '@/lib/auth/require-ai-access'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'

export async function POST(request: Request) {
  const aiAccess = await requireAiAccess()
  if (!aiAccess.ok) {
    const status = aiAccess.reason === 'unauthorized' ? 401 : 403
    return NextResponse.json({ error: aiAccess.reason }, { status })
  }

  const userId = aiAccess.userId

  if (!isCvBuilderConfigured()) {
    return NextResponse.json({ error: 'cv_builder_not_configured' }, { status: 503 })
  }

  const rateCheck = await checkDurableRateLimit({
    key: `profile:suggest-skills:user:${userId}`,
    max: 20,
    windowSeconds: 3600,
  })
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = suggestSkillsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const { experience, current_skills } = parsed.data
  const existing = new Set(current_skills.map((s) => s.toLowerCase()))

  const summary = experience
    .map((e) => `${e.title} at ${e.company}: ${e.description}`)
    .join('\n')

  const result = await editWithCvBuilder({
    instruction:
      'Suggest up to 20 relevant professional skills based on this work experience. Return ONLY a JSON array of skill strings, no markdown, no explanation.',
    content: summary,
    context: { current_skills },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status })
  }

  let suggestions: string[] = []
  try {
    const parsedSkills = JSON.parse(result.result) as unknown
    if (Array.isArray(parsedSkills)) {
      suggestions = parsedSkills
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  } catch {
    suggestions = result.result
      .split(/[\n,]/)
      .map((s) => s.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
  }

  const unique = suggestions
    .filter((s) => !existing.has(s.toLowerCase()))
    .slice(0, 20)

  return NextResponse.json({ skills: unique })
}
