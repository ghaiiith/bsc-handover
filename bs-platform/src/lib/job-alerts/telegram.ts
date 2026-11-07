import 'server-only'

/**
 * Round 9 (BS-104): Telegram delivery for job alerts.
 *
 * Telegram was only ever a SOURCE of jobs on this platform; this is the first
 * outbound use. It needs a bot token (TELEGRAM_BOT_TOKEN) and, per candidate,
 * the chat id Telegram assigns when they open the bot — captured through the
 * one-time link code the account settings page shows. Absent either, the
 * sender reports "unconfigured"/"unlinked" and the alert falls back to the
 * in-app channel; it never throws.
 */

const API = 'https://api.telegram.org'

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim())
}

export function getTelegramBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME?.trim() || null
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return { ok: false, error: 'not_configured' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { description?: string }
      return { ok: false, error: body.description ?? `http_${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/** Telegram's HTML mode accepts a small tag set; everything else must be escaped. */
export function escapeTelegramHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
