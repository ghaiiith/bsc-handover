import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { fetchExternalJobs } from '@/lib/jobs/scraping/fetch-external-jobs'

/**
 * Scheduled pull of the external job feed (Iraqi Job Pool). Paginates newest
 * first and dedupes, so each run only ingests new postings.
 */
export const maxDuration = 60

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await fetchExternalJobs()
  return NextResponse.json(result)
}
