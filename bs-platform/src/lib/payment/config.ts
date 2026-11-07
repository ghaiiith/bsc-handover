import type { PaymentMethod } from '@/types'

export const SUPPORT_EMAIL = 'support@bs-platform.com'

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'http://localhost:3000'
  )
}

export function isPaymentDevMode(): boolean {
  // Hard guard: the dev-mode bypass (which trusts gateway callback params without
  // a server-to-server verify) must NEVER activate in production, even if the env
  // var is accidentally set there. Otherwise anyone hitting the callback with
  // status=success could complete payments / enroll for free.
  return (
    process.env.PAYMENT_DEV_MODE === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
}

/** Temporary bypass for service checkout while gateways are not wired up. */
export function canSkipServicePayment(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function isZainCashConfigured(): boolean {
  return Boolean(
    process.env.ZAINCASH_MERCHANT_ID &&
      process.env.ZAINCASH_SECRET_KEY &&
      process.env.ZAINCASH_API_URL
  )
}

export function isQiCardConfigured(): boolean {
  return Boolean(
    process.env.QICARD_API_KEY && process.env.QICARD_API_URL
  )
}

export function isWaylConfigured(): boolean {
  return Boolean(
    process.env.WAYL_SECRET_TOKEN && process.env.WAYL_WEBHOOK_SECRET
  )
}

/** thewayl.com API env — 'live' for real charges, 'test' for sandbox links. */
export function getWaylEnv(): 'live' | 'test' {
  return process.env.WAYL_ENV === 'test' ? 'test' : 'live'
}

export function getWaylApiUrl(): string {
  return (
    process.env.WAYL_API_URL?.replace(/\/$/, '') ?? 'https://api.thewayl.com'
  )
}

/**
 * Report BS-55: thewayl.com rejects any link whose total is below this floor
 * (its API returns a 422 "too_small" on `total`). Enforced BEFORE the gateway
 * call so the buyer gets a clear "minimum amount" message instead of a generic
 * failure, and so we never create an orphan pending order for an amount Wayl
 * will refuse. Overridable via WAYL_MIN_AMOUNT if thewayl changes the floor.
 */
export function getWaylMinAmount(): number {
  const raw = Number(process.env.WAYL_MIN_AMOUNT)
  return Number.isFinite(raw) && raw > 0 ? raw : 1000
}

export function isGatewayConfigured(method: PaymentMethod): boolean {
  if (method === 'zaincash') return isZainCashConfigured()
  if (method === 'wayl') return isWaylConfigured()
  return isQiCardConfigured()
}

export function getPaymentCallbackUrl(method: PaymentMethod): string {
  const base = getAppUrl()
  if (method === 'zaincash') {
    return `${base}/api/payment/zaincash/callback`
  }
  if (method === 'wayl') {
    return `${base}/api/payment/wayl/webhook`
  }
  return `${base}/api/payment/qicard/callback`
}

export function getPaymentRedirectUrls(locale: string, courseId: string) {
  const base = getAppUrl()
  return {
    success: `${base}/${locale}/payment/success?courseId=${courseId}`,
    failure: `${base}/${locale}/payment/failed`,
  }
}
