/**
 * Report BS-93: the share action on a business profile never sent anything.
 *
 * It called `navigator.clipboard.writeText` and nothing else — no WhatsApp
 * window, no message, and a silent failure whenever the clipboard permission
 * was refused. This builds a real WhatsApp share URL and reports precisely why
 * it could not open, so the caller can offer a retry instead of a dead button.
 */

export interface WhatsAppShareInput {
  /** The message body. The link is appended on its own line. */
  text: string
  /** A reachable public URL — the profile page or the PDF itself. */
  url: string
  /** Optional recipient in international digits, e.g. "9647701234567". */
  phone?: string
}

/** wa.me works on desktop web, the desktop app, and mobile. */
export function buildWhatsAppShareUrl({ text, url, phone }: WhatsAppShareInput): string {
  const body = encodeURIComponent(`${text.trim()}\n${url.trim()}`)
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}?text=${body}` : `https://wa.me/?text=${body}`
}

export type ShareOutcome =
  | { ok: true; via: 'native' | 'whatsapp' }
  | { ok: false; reason: 'blocked' | 'cancelled' | 'unsupported' }

/**
 * Share to WhatsApp. Uses the OS share sheet when the browser offers one
 * (mobile), otherwise opens the WhatsApp web/desktop flow in a new tab.
 *
 * `blocked` means the popup blocker stopped the window — the caller should show
 * a retry, because a second click triggered directly by the user usually works.
 */
export async function shareToWhatsApp(
  input: WhatsAppShareInput,
  options?: { preferNative?: boolean }
): Promise<ShareOutcome> {
  const shareUrl = buildWhatsAppShareUrl(input)

  if (options?.preferNative !== false && typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ text: input.text, url: input.url })
      return { ok: true, via: 'native' }
    } catch (err) {
      // AbortError is the user closing the sheet — not a failure to report.
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, reason: 'cancelled' }
      }
      // Anything else: fall through to the WhatsApp URL.
    }
  }

  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' }

  const opened = window.open(shareUrl, '_blank', 'noopener,noreferrer')
  if (!opened) return { ok: false, reason: 'blocked' }

  return { ok: true, via: 'whatsapp' }
}
