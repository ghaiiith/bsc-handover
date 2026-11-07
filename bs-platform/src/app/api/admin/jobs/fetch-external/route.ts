import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import { fetchExternalJobs } from '@/lib/jobs/scraping/fetch-external-jobs'

/** Admin-triggered "fetch now" for the external job feed (report: automation). */
export const maxDuration = 60

export async function POST() {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await fetchExternalJobs()
  revalidatePath('/ar/admin/jobs/imported')
  revalidatePath('/en/admin/jobs/imported')
  return NextResponse.json(result)
}
