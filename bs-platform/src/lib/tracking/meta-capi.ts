import 'server-only'

import { createHash } from 'node:crypto'
import { getPlatformSettings } from '@/lib/admin/platform-settings'

/**
 * Marketing request item 3: Meta Conversions API.
 *
 * The browser Pixel is blocked on most iOS devices; CAPI posts the same
 * events from the server, so Ads Manager still sees Leads, Registrations and
 * Purchases. Matching keys (email, phone) are SHA-256 hashed before they leave
 * the server, as Meta requires — raw contact data is never sent.
 *
 * Fire-and-forget by design: an ad-platform outage must never fail a signup
 * or a payment. Configured entirely from the admin dashboard.
 */

const GRAPH_VERSION = 'v19.0'

export type CapiEvent = 'Lead' | 'CompleteRegistration' | 'Purchase' | 'InitiateCheckout'

export interface CapiUser {
  email?: string | null
  phone?: string | null
  externalId?: string | null
  clientIp?: string | null
  userAgent?: string | null
  /** _fbp / _fbc cookies when the request came from a browser. */
  fbp?: string | null
  fbc?: string | null
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, '')
  // Iraqi local numbers → E.164 (964…)
  if (digits.startsWith('0') && digits.length === 11) return `964${digits.slice(1)}`
  return digits
}

export function buildUserData(u: CapiUser): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (u.email) out.em = [sha256(u.email.trim().toLowerCase())]
  if (u.phone) out.ph = [sha256(normalizePhone(u.phone))]
  if (u.externalId) out.external_id = [sha256(u.externalId)]
  if (u.clientIp) out.client_ip_address = u.clientIp
  if (u.userAgent) out.client_user_agent = u.userAgent
  if (u.fbp) out.fbp = u.fbp
  if (u.fbc) out.fbc = u.fbc
  return out
}

export async function sendMetaConversion(input: {
  event: CapiEvent
  user: CapiUser
  eventId?: string
  sourceUrl?: string
  value?: number
  currency?: string
  contentName?: string
}): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const s = await getPlatformSettings()
  const pixelId = s.meta_pixel_id?.trim()
  const token = s.meta_capi_access_token?.trim()
  if (!pixelId || !token) return { ok: false, skipped: 'not_configured' }

  const body = {
    data: [
      {
        event_name: input.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.sourceUrl,
        action_source: 'website',
        user_data: buildUserData(input.user),
        custom_data:
          input.value !== undefined || input.contentName
            ? {
                value: input.value,
                currency: input.currency ?? 'IQD',
                content_name: input.contentName,
              }
            : undefined,
      },
    ],
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    )
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      console.error('[meta-capi] rejected:', err.error?.message ?? res.status)
      return { ok: false, error: err.error?.message ?? `http_${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    console.error('[meta-capi] failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/** Pull the browser-side matching keys out of an incoming request. */
export function capiUserFromRequest(request: Request): Pick<CapiUser, 'clientIp' | 'userAgent' | 'fbp' | 'fbc'> {
  const cookie = request.headers.get('cookie') ?? ''
  const get = (name: string) => cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] ?? null
  return {
    clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent'),
    fbp: get('_fbp'),
    fbc: get('_fbc'),
  }
}
