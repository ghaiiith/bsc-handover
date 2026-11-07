import { NextResponse } from 'next/server'
import { runMonthlyJobStatusPing } from '@/lib/jobs/job-status'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'

// Report BS-64: monthly "did you find a job?" ping. Scheduled in vercel.json.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await runMonthlyJobStatusPing()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/monthly-job-status]', err)
    return NextResponse.json({ error: 'ping_failed' }, { status: 500 })
  }
}
