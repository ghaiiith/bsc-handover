import { NextResponse } from 'next/server'
import { completePayment, failPayment } from '@/lib/payment/complete-payment'
import { verifyQiCardPayment } from '@/lib/payment/gateways/qicard'
import { getAppUrl } from '@/lib/payment/config'

function extractCallbackData(request: Request) {
  const url = new URL(request.url)
  const referenceId =
    url.searchParams.get('reference_id') ??
    url.searchParams.get('referenceId') ??
    undefined
  const transactionId =
    url.searchParams.get('transaction_id') ??
    url.searchParams.get('transactionId') ??
    undefined
  const status =
    url.searchParams.get('status') ??
    url.searchParams.get('payment_status') ??
    undefined
  const locale = url.searchParams.get('locale') ?? 'ar'

  return { referenceId, transactionId, status, locale }
}

async function handleCallback(request: Request) {
  let referenceId: string | undefined
  let transactionId: string | undefined
  let status: string | undefined
  let locale = 'ar'

  if (request.method === 'POST') {
    try {
      const body = await request.json()
      referenceId =
        body.reference_id ?? body.referenceId ?? body.orderId ?? undefined
      transactionId =
        body.transaction_id ?? body.transactionId ?? body.id ?? undefined
      status = body.status ?? body.payment_status ?? undefined
      locale = body.locale ?? 'ar'
    } catch {
      const extracted = extractCallbackData(request)
      referenceId = extracted.referenceId
      transactionId = extracted.transactionId
      status = extracted.status
      locale = extracted.locale
    }
  } else {
    const extracted = extractCallbackData(request)
    referenceId = extracted.referenceId
    transactionId = extracted.transactionId
    status = extracted.status
    locale = extracted.locale
  }

  const appUrl = getAppUrl()

  if (!referenceId) {
    console.error('[qicard/callback] Missing reference_id')
    return NextResponse.redirect(
      `${appUrl}/${locale}/payment/failed?reason=verification_failed`
    )
  }

  const verified = await verifyQiCardPayment({
    referenceId,
    transactionId,
    status,
  })

  if (!verified) {
    const { courseId, orderId } = await failPayment(referenceId, locale)
    const extra = orderId
      ? `&orderId=${orderId}&type=service`
      : courseId
        ? `&courseId=${courseId}`
        : ''
    return NextResponse.redirect(
      `${appUrl}/${locale}/payment/failed?reason=verification_failed${extra}`
    )
  }

  const result = await completePayment(referenceId, transactionId, locale)

  if (!result.success) {
    return NextResponse.redirect(
      `${appUrl}/${locale}/payment/failed?reason=verification_failed`
    )
  }

  if (result.type === 'service' && result.orderId) {
    return NextResponse.redirect(
      `${appUrl}/${locale}/payment/success?orderId=${result.orderId}&type=service`
    )
  }

  if (!result.courseId) {
    return NextResponse.redirect(
      `${appUrl}/${locale}/payment/failed?reason=verification_failed`
    )
  }

  return NextResponse.redirect(
    `${appUrl}/${locale}/payment/success?courseId=${result.courseId}`
  )
}

export async function GET(request: Request) {
  return handleCallback(request)
}

export async function POST(request: Request) {
  return handleCallback(request)
}
