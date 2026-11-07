import {
  getAppUrl,
  getPaymentCallbackUrl,
  isPaymentDevMode,
  isZainCashConfigured,
} from '@/lib/payment/config'

export interface InitiateZainCashParams {
  amount: number
  referenceId: string
  locale: string
  productId: string
  paymentType: 'course' | 'service' | 'subscription'
}

export interface InitiateZainCashResult {
  redirectUrl: string
}

export async function initiateZainCashPayment(
  params: InitiateZainCashParams
): Promise<InitiateZainCashResult> {
  const { amount, referenceId, locale, productId, paymentType } = params
  const callbackUrl = getPaymentCallbackUrl('zaincash')
  const appUrl = getAppUrl()
  const successParam =
    paymentType === 'service'
      ? `orderId=${productId}&type=service`
      : `courseId=${productId}`
  const successRedirect = `${appUrl}/${locale}/payment/success?${successParam}`
  const failureRedirect = `${appUrl}/${locale}/payment/failed`

  if (!isZainCashConfigured()) {
    if (isPaymentDevMode()) {
      const redirectUrl = `${callbackUrl}?reference_id=${referenceId}&status=success&transaction_id=DEV-ZC-${referenceId}&locale=${locale}`
      return { redirectUrl }
    }
    throw new Error('ZainCash is not configured')
  }

  // TODO: Integrate Wayl Team / ZainCash API
  const apiUrl = process.env.ZAINCASH_API_URL!
  const merchantId = process.env.ZAINCASH_MERCHANT_ID!

  const response = await fetch(`${apiUrl}/transaction/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ZAINCASH_SECRET_KEY}`,
    },
    body: JSON.stringify({
      merchantId,
      amount,
      referenceId,
      callbackUrl,
      successRedirect,
      failureRedirect,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[zaincash] Initiate failed:', response.status, text)
    throw new Error('gateway_initiate_failed')
  }

  const data = (await response.json()) as { redirectUrl?: string; url?: string }
  const redirectUrl = data.redirectUrl ?? data.url

  if (!redirectUrl) {
    throw new Error('gateway_no_redirect')
  }

  return { redirectUrl }
}

export interface VerifyZainCashParams {
  referenceId: string
  transactionId?: string
  status?: string
}

export async function verifyZainCashPayment(
  params: VerifyZainCashParams
): Promise<boolean> {
  if (!isZainCashConfigured()) {
    if (isPaymentDevMode()) {
      return params.status !== 'failure' && params.status !== 'failed'
    }
    console.error('[zaincash] Not configured and dev mode off')
    return false
  }

  // TODO: Integrate Wayl Team / ZainCash verify API — never trust callback params alone
  const apiUrl = process.env.ZAINCASH_API_URL!

  const response = await fetch(`${apiUrl}/transaction/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ZAINCASH_SECRET_KEY}`,
    },
    body: JSON.stringify({
      referenceId: params.referenceId,
      transactionId: params.transactionId,
    }),
  })

  if (!response.ok) {
    console.error('[zaincash] Verify failed:', response.status)
    return false
  }

  const data = (await response.json()) as { success?: boolean; status?: string }
  return data.success === true || data.status === 'success'
}
