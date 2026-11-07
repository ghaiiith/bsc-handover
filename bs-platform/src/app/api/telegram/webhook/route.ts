import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage } from '@/lib/job-alerts/telegram'

/**
 * Round 9 (BS-104): Telegram bot webhook. Only one command matters —
 * `/start <code>` — which links the sender's chat id to the platform account
 * that minted the code. Everything else gets a short help reply.
 *
 * Protected with Telegram's secret-token header (set when registering the
 * webhook with `secret_token=TELEGRAM_WEBHOOK_SECRET`).
 */
export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  if (expected && request.headers.get('x-telegram-bot-api-secret-token') !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update = (await request.json().catch(() => null)) as {
    message?: { chat?: { id?: number | string }; text?: string }
  } | null
  const chatId = update?.message?.chat?.id
  const text = update?.message?.text?.trim() ?? ''
  if (!chatId) return NextResponse.json({ ok: true })

  const m = /^\/start\s+([a-f0-9]{12})$/i.exec(text)
  if (!m) {
    await sendTelegramMessage(
      String(chatId),
      'مرحباً! لربط حسابك على Business Skills، افتح إعدادات التنبيهات بالمنصة واضغط «ربط تلغرام».'
    )
    return NextResponse.json({ ok: true })
  }

  const admin = createAdminClient()
  const { data: user } = await admin
    .from('users')
    .select('id, telegram_link_expires_at')
    .eq('telegram_link_code', m[1].toLowerCase())
    .maybeSingle()

  const expired =
    !user?.telegram_link_expires_at ||
    new Date(user.telegram_link_expires_at as string).getTime() < Date.now()
  if (!user || expired) {
    await sendTelegramMessage(String(chatId), 'رمز الربط غير صالح أو منتهي. أنشئ رمزاً جديداً من المنصة.')
    return NextResponse.json({ ok: true })
  }

  await admin
    .from('users')
    .update({ telegram_chat_id: String(chatId), telegram_link_code: null, telegram_link_expires_at: null })
    .eq('id', user.id)

  await sendTelegramMessage(String(chatId), '✅ تم ربط حسابك. ستصلك هنا الوظائف التي تطابق ملفك بنسبة عالية.')
  return NextResponse.json({ ok: true })
}
