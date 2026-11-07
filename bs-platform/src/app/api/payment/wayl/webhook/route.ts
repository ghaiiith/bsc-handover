import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { completePayment, failPayment } from '@/lib/payment/complete-payment'
import {
  fetchWaylPaymentStatus,
  verifyWaylWebhookSignature,
} from '@/lib/payment/gateways/wayl'
import { getAppUrl, isPaymentDevMode } from '@/lib/payment/config'
import { checkDurableRateLimit, getClientIp } from '@/lib/rate-limit/durable'

export const runtime = 'nodejs'

// Exact-match terminal-failure statuses (mirrors the paid whitelist in wayl.ts).
const FAILED_STATUSES = new Set([
  'failed',
  'cancelled',
  'canceled',
  'declined',
  'expired',
  'refused',
  'voided',
  'rejected',
])
const isFailedStatus = (s: string) =>
  FAILED_STATUSES.has(s.trim().toLowerCase())

/**
 * Wayl (thewayl.com) payment webhook.
 *
 * Defense in depth, all fail-closed:
 *  1. HMAC-SHA256 signature over the raw body (authenticity of the trigger).
 *  2. Independent server-to-server status lookup against Wayl's API — the
 *     AUTHORITATIVE source. A completion is granted only when Wayl itself
 *     reports the link paid, so a leaked webhook secret alone cannot forge one.
 *  3. Amount is re-validated against the stored payment using Wayl's reported
 *     total (must be present and equal).
 */
export async function POST(request: Request) {
  const rate = await checkDurableRateLimit({
    key: `wayl-webhook:ip:${getClientIp(request)}`,
    max: 120,
    windowSeconds: 60,
  })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-wayl-signature-256')

  if (!verifyWaylWebhookSignature(rawBody, signature)) {
    console.error('[payment/wayl] webhook signature verification failed')
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const referenceId =
    (payload.referenceId as string) ?? (payload.reference_id as string) ?? null
  if (!referenceId) {
    return NextResponse.json({ error: 'missing_reference' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: payment } = await admin
    .from('payments')
    .select('id, amount, status')
    .eq('reference_id', referenceId)
    .maybeSingle()

  if (!payment) {
    console.error('[payment/wayl] unknown referenceId:', referenceId)
    // 200 so Wayl stops retrying a reference we don't own.
    return NextResponse.json({ received: true })
  }

  const waylId = (payload.id as string) ?? (payload.code as string) ?? undefined

  // (2) Authoritative server-to-server confirmation.
  const confirmed = await fetchWaylPaymentStatus(referenceId)
  if (!confirmed) {
    // Could not reach Wayl / link not found — never complete on a bare webhook.
    // 503 asks Wayl to retry once the lookup can succeed.
    console.error('[payment/wayl] status lookup unavailable for', referenceId)
    return NextResponse.json({ error: 'verification_unavailable' }, { status: 503 })
  }

  if (!confirmed.paid) {
    // Not paid per Wayl. Mark failed only on a terminal failure signal.
    const webhookStatus = `${payload.paymentStatus ?? ''} ${payload.status ?? ''}`
    if (isFailedStatus(webhookStatus) || webhookStatus.trim().split(/\s+/).some(isFailedStatus)) {
      await failPayment(referenceId)
      return NextResponse.json({ received: true, status: 'failed' })
    }
    // Still pending/created — acknowledge without acting.
    return NextResponse.json({ received: true, status: confirmed.status })
  }

  // (3) Amount must be present and match the stored payment.
  const expected = Math.round(Number(payment.amount))
  if (confirmed.total === null || confirmed.total !== expected) {
    console.error(
      `[payment/wayl] amount mismatch ref=${referenceId} wayl=${confirmed.total} expected=${expected}`
    )
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 })
  }

  const result = await completePayment(referenceId, waylId, 'ar')
  if (!result.success) {
    return NextResponse.json({ error: 'completion_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, status: 'completed' })
}

/**
 * Dev-mode-only browser fallback (never active in production): the fake gateway
 * redirect lands here with query params so local checkout can complete.
 */
export async function GET(request: Request) {
  const appUrl = getAppUrl()
  const url = new URL(request.url)
  const locale = url.searchParams.get('locale') ?? 'ar'

  if (!isPaymentDevMode()) {
    return NextResponse.redirect(`${appUrl}/${locale}/payment/failed`)
  }

  const referenceId = url.searchParams.get('reference_id')
  const transactionId = url.searchParams.get('transaction_id') ?? undefined
  if (!referenceId) {
    return NextResponse.redirect(`${appUrl}/${locale}/payment/failed`)
  }

  const result = await completePayment(referenceId, transactionId, locale)
  if (!result.success) {
    return NextResponse.redirect(`${appUrl}/${locale}/payment/failed`)
  }
  if (result.type === 'service' && result.orderId) {
    return NextResponse.redirect(
      `${appUrl}/${locale}/payment/success?orderId=${result.orderId}&type=service`
    )
  }
  if (result.type === 'subscription') {
    return NextResponse.redirect(`${appUrl}/${locale}/payment/success?type=subscription`)
  }
  return NextResponse.redirect(
    `${appUrl}/${locale}/payment/success?courseId=${result.courseId ?? ''}`
  )
}
