import { NextResponse } from 'next/server'
import { runProviderHealthChecks } from '@/lib/video-providers/provider-health'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    await runProviderHealthChecks()
    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[cron/video-provider-health]', err)
    return NextResponse.json({ error: 'health_check_failed' }, { status: 500 })
  }
}
