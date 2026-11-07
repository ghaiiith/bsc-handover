import { NextResponse } from 'next/server'
import { runCronJobFetch } from '@/lib/jobs/scraping/cron-fetch'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await runCronJobFetch()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron-fetch]', err)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
}
