import { NextResponse } from 'next/server'
import { expireStalePayments } from '@/lib/payment/expire-stale-payments'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'

// Report BS-55: clean up abandoned checkouts (pending payments + their orders).
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await expireStalePayments())
  } catch (err) {
    console.error('[cron/expire-stale-payments]', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
