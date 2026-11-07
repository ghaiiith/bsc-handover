import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { scanForVideoLeaks } from '@/lib/video/leak-detection'

export const runtime = 'nodejs'

/** Periodic content-leak / abuse scan over video_security_logs (CRON_SECRET gated). */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await scanForVideoLeaks()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/video-leak-scan]', err)
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 })
  }
}
