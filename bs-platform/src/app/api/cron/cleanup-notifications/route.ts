import { NextResponse } from 'next/server'
import { runNotificationCleanup } from '@/lib/notifications/cleanup'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await runNotificationCleanup()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/cleanup-notifications]', err)
    return NextResponse.json({ error: 'cleanup_failed' }, { status: 500 })
  }
}
