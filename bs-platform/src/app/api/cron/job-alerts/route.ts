import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { runJobAlertSweep } from '@/lib/job-alerts/dispatch'

/** Round 9 (BS-104): hourly sweep for ≥80% matches on newly published jobs. */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await runJobAlertSweep()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/job-alerts] failed:', err)
    return NextResponse.json({ ok: false, error: 'sweep_failed' }, { status: 500 })
  }
}
