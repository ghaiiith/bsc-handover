import {
  getAppUrl,
  getPaymentCallbackUrl,
  isPaymentDevMode,
  isQiCardConfigured,
} from '@/lib/payment/config'

export interface InitiateQiCardParams {
  amount: number
  referenceId: string
  locale: string
  productId: string
  paymentType: 'course' | 'service' | 'subscription'
}

export interface InitiateQiCardResult {
  redirectUrl: string
}

export async function initiateQiCardPayment(
  params: InitiateQiCardParams
): Promise<InitiateQiCardResult> {
  const { amount, referenceId, locale, productId, paymentType } = params
  const callbackUrl = getPaymentCallbackUrl('qicard')
  const appUrl = getAppUrl()
  const successParam =
    paymentType === 'service'
      ? `orderId=${productId}&type=service`
      : `courseId=${productId}`
  const successRedirect = `${appUrl}/${locale}/payment/success?${successParam}`
  const failureRedirect = `${appUrl}/${locale}/payment/failed`

  if (!isQiCardConfigured()) {
    if (isPaymentDevMode()) {
      const redirectUrl = `${callbackUrl}?reference_id=${referenceId}&status=success&transaction_id=DEV-QC-${referenceId}&locale=${locale}`
      return { redirectUrl }
    }
    throw new Error('Qi Card is not configured')
  }

  // TODO: Integrate Wayl Team / Qi Card API
  const apiUrl = process.env.QICARD_API_URL!

  const response = await fetch(`${apiUrl}/payments/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.QICARD_API_KEY!,
    },
    body: JSON.stringify({
      amount,
      referenceId,
      callbackUrl,
      successRedirect,
      failureRedirect,
      currency: 'IQD',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[qicard] Initiate failed:', response.status, text)
    throw new Error('gateway_initiate_failed')
  }

  const data = (await response.json()) as { redirectUrl?: string; paymentUrl?: string }
  const redirectUrl = data.redirectUrl ?? data.paymentUrl

  if (!redirectUrl) {
    throw new Error('gateway_no_redirect')
  }

  return { redirectUrl }
}

export interface VerifyQiCardParams {
  referenceId: string
  transactionId?: string
  status?: string
}

export async function verifyQiCardPayment(
  params: VerifyQiCardParams
): Promise<boolean> {
  if (!isQiCardConfigured()) {
    if (isPaymentDevMode()) {
      return params.status !== 'failure' && params.status !== 'failed'
    }
    console.error('[qicard] Not configured and dev mode off')
    return false
  }

  // TODO: Integrate Wayl Team / Qi Card verify API
  const apiUrl = process.env.QICARD_API_URL!

  const response = await fetch(`${apiUrl}/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.QICARD_API_KEY!,
    },
    body: JSON.stringify({
      referenceId: params.referenceId,
      transactionId: params.transactionId,
    }),
  })

  if (!response.ok) {
    console.error('[qicard] Verify failed:', response.status)
    return false
  }

  const data = (await response.json()) as { success?: boolean; status?: string }
  return data.success === true || data.status === 'success'
}
