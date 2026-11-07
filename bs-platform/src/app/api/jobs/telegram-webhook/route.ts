import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import {
  findTelegramSourceByUsername,
  insertImportedJobIfNew,
} from '@/lib/jobs/scraping/import-job-item'
import { processImportedJob } from '@/lib/jobs/scraping/process-imported-job'

function secretsMatch(a: string, b: string): boolean {
  // Hash to a fixed length so timingSafeEqual never throws on length mismatch.
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

interface TelegramUpdate {
  channel_post?: {
    message_id: number
    date: number
    text?: string
    chat?: { username?: string; title?: string }
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  // Fail closed: if the secret isn't configured, reject every request rather
  // than accepting unauthenticated/forged Telegram updates.
  if (!webhookSecret) {
    console.error('[telegram-webhook] TELEGRAM_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token')
  if (!headerSecret || !secretsMatch(headerSecret, webhookSecret)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ ok: true })
  }

  const post = update.channel_post
  if (!post?.text) {
    return NextResponse.json({ ok: true })
  }

  const text = post.text.trim()
  if (text.length < 50) {
    return NextResponse.json({ ok: true })
  }

  const username = post.chat?.username
  if (!username) {
    return NextResponse.json({ ok: true })
  }

  const source = await findTelegramSourceByUsername(username)
  if (!source) {
    return NextResponse.json({ ok: true })
  }

  const messageId = post.message_id.toString()
  const sourceUrl = `https://t.me/${username}/${post.message_id}`

  const result = await insertImportedJobIfNew(source.id, 'telegram', {
    raw_content: text,
    source_url: sourceUrl,
    source_post_id: messageId,
  })

  if (result.inserted && result.id) {
    void processImportedJob(result.id)
  }

  return NextResponse.json({ ok: true })
}
