import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'
import {
  getAppUrl,
  getPaymentCallbackUrl,
  getWaylApiUrl,
  getWaylEnv,
  isPaymentDevMode,
  isWaylConfigured,
} from '@/lib/payment/config'

export interface InitiateWaylParams {
  amount: number
  referenceId: string
  locale: string
  productId: string
  paymentType: 'course' | 'service' | 'subscription' | 'academy'
}

export interface InitiateWaylResult {
  redirectUrl: string
}

interface WaylLinkResponse {
  success?: boolean
  message?: string
  data?: { url?: string; id?: string; code?: string }
}

/**
 * Create a Wayl (thewayl.com) hosted checkout link and return the URL to send
 * the customer to. Payment is confirmed later, server-to-server, via the signed
 * webhook — never trusted from the browser redirect.
 */
export async function initiateWaylPayment(
  params: InitiateWaylParams
): Promise<InitiateWaylResult> {
  const { amount, referenceId, locale, productId, paymentType } = params
  const appUrl = getAppUrl()
  const webhookUrl = getPaymentCallbackUrl('wayl')
  const successParam =
    paymentType === 'service'
      ? `orderId=${productId}&type=service`
      : paymentType === 'subscription'
        ? `type=subscription`
        : paymentType === 'academy'
          ? `type=academy`
          : `courseId=${productId}`
  const redirectionUrl = `${appUrl}/${locale}/payment/success?${successParam}`

  // Wayl amounts are whole IQD integers.
  const total = Math.round(amount)

  if (!isWaylConfigured()) {
    if (isPaymentDevMode()) {
      const redirectUrl = `${webhookUrl}?reference_id=${referenceId}&status=success&transaction_id=DEV-WAYL-${referenceId}&locale=${locale}`
      return { redirectUrl }
    }
    throw new Error('Wayl is not configured')
  }

  const response = await fetch(`${getWaylApiUrl()}/api/v1/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WAYL-AUTHENTICATION': process.env.WAYL_SECRET_TOKEN!,
    },
    body: JSON.stringify({
      env: getWaylEnv(),
      referenceId,
      total,
      currency: 'IQD',
      customParameter: `${paymentType}:${productId}`,
      lineItem: [
        {
          label: paymentType === 'service' ? 'Service order' : 'Course enrollment',
          amount: total,
          type: 'increase',
        },
      ],
      webhookUrl,
      webhookSecret: process.env.WAYL_WEBHOOK_SECRET!,
      redirectionUrl,
    }),
  })

  const json = (await response.json().catch(() => null)) as WaylLinkResponse | null

  if (!response.ok || !json?.success || !json.data?.url) {
    console.error('[payment/wayl] link creation failed:', response.status, json?.message)
    throw new Error('Wayl link creation failed')
  }

  return { redirectUrl: json.data.url }
}

// EXACT status match (a substring regex would treat "unpaid"/"not_approved" as paid).
const PAID_STATUSES = new Set([
  'paid',
  'completed',
  'complete',
  'success',
  'successful',
  'captured',
  'approved',
  'settled',
  'done',
])

export function isWaylPaidStatus(status: string | null | undefined): boolean {
  return PAID_STATUSES.has(String(status ?? '').trim().toLowerCase())
}

export interface WaylPaymentStatus {
  paid: boolean
  total: number | null
  status: string
}

/**
 * Server-to-server confirmation: fetch the link straight from Wayl (authenticated
 * with the SECRET TOKEN, not the webhook secret) and read its authoritative
 * status + total. This is the defense that survives a leaked webhook secret — a
 * forged signed webhook still can't complete a payment Wayl doesn't report paid.
 * Returns null when the lookup itself fails (treated as "not confirmed").
 */
export async function fetchWaylPaymentStatus(
  referenceId: string
): Promise<WaylPaymentStatus | null> {
  if (!isWaylConfigured()) return null
  try {
    const res = await fetch(
      `${getWaylApiUrl()}/api/v1/links/${encodeURIComponent(referenceId)}`,
      { headers: { 'X-WAYL-AUTHENTICATION': process.env.WAYL_SECRET_TOKEN! } }
    )
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; data?: { status?: string; total?: string | number } }
      | null
    if (!res.ok || !json?.success || !json.data) return null
    const status = String(json.data.status ?? '')
    const total = Number(json.data.total)
    return {
      paid: isWaylPaidStatus(status),
      total: Number.isFinite(total) ? Math.round(total) : null,
      status,
    }
  } catch (err) {
    console.error('[payment/wayl] status lookup failed:', err)
    return null
  }
}

/**
 * Verify a Wayl webhook: HMAC-SHA256 over the RAW request body, keyed with the
 * merchant webhookSecret, compared constant-time against the
 * `x-wayl-signature-256` header. Fails closed.
 */
export function verifyWaylWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.WAYL_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false

  // Accept an optional "sha256=" prefix (GitHub-style) or a bare hex digest.
  const provided = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase()
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  const a = Buffer.from(provided, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || a.length === 0) return false
  return timingSafeEqual(a, b)
}
