import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAiAccess } from '@/lib/auth/require-ai-access'
import { checkCommunityAiSearchRateLimit } from '@/lib/community/ai-search-rate-limit'
import { logCommunityAiSearch } from '@/lib/community/ai-search-analytics'
import { runCommunityAiSearch } from '@/lib/community/community-ai-search'

const searchSchema = z.object({
  query: z.string().min(5).max(500),
})

export async function POST(request: Request) {
  const aiAccess = await requireAiAccess()
  if (!aiAccess.ok) {
    const status = aiAccess.reason === 'unauthorized' ? 401 : 403
    return NextResponse.json({ error: aiAccess.reason }, { status })
  }

  const rateCheck = checkCommunityAiSearchRateLimit(aiAccess.userId)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = searchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  try {
    const { results } = await runCommunityAiSearch(parsed.data.query.trim())
    void logCommunityAiSearch(aiAccess.userId)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('[community/ai-search]', error)
    return NextResponse.json({ error: 'search_failed' }, { status: 500 })
  }
}
