import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTelegramBotUsername, isTelegramConfigured } from '@/lib/job-alerts/telegram'

/**
 * Round 9 (BS-104): mint a one-time code the candidate sends to the bot
 * (`/start <code>`). The webhook exchanges it for their chat id. Codes expire
 * in 15 minutes and are single-use.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isTelegramConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const code = randomBytes(6).toString('hex')
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const { error } = await createAdminClient()
    .from('users')
    .update({ telegram_link_code: code, telegram_link_expires_at: expires })
    .eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bot = getTelegramBotUsername()
  return NextResponse.json({
    code,
    expiresAt: expires,
    deepLink: bot ? `https://t.me/${bot}?start=${code}` : null,
  })
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  await createAdminClient()
    .from('users')
    .update({ telegram_chat_id: null, telegram_link_code: null, telegram_link_expires_at: null })
    .eq('id', user.id)
  return NextResponse.json({ ok: true })
}
