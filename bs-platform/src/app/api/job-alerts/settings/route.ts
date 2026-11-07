import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isProUser } from '@/lib/subscription/pro-access'
import { getTelegramBotUsername, isTelegramConfigured } from '@/lib/job-alerts/telegram'

/**
 * Round 9 (BS-104): a candidate's own alert preferences. Opt-in only; the
 * default is off. Reads and writes go through the service role scoped to the
 * caller's row (the alert columns are not in the authenticated column grant).
 */

const schema = z.object({
  enabled: z.boolean().optional(),
  minScore: z.number().int().min(50).max(100).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await createAdminClient()
    .from('users')
    .select('job_alerts_enabled, job_alerts_min_score, telegram_chat_id')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    enabled: Boolean(data?.job_alerts_enabled),
    minScore: (data?.job_alerts_min_score as number) ?? 80,
    telegramLinked: Boolean(data?.telegram_chat_id),
    telegramAvailable: isTelegramConfigured(),
    telegramBot: getTelegramBotUsername(),
    emailIncluded: await isProUser(user.id),
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (parsed.data.enabled !== undefined) updates.job_alerts_enabled = parsed.data.enabled
  if (parsed.data.minScore !== undefined) updates.job_alerts_min_score = parsed.data.minScore

  const { error } = await createAdminClient().from('users').update(updates).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
