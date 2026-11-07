import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAllAdmins } from '@/lib/admin/notify-admins'
import { fetchLinkedInJobs, fetchRssItems } from '@/lib/jobs/scraping/fetch-sources'
import { insertImportedJobIfNew } from '@/lib/jobs/scraping/import-job-item'
import { processPendingImports } from '@/lib/jobs/scraping/process-imported-job'
import type { JobSource } from '@/types/job-scraping'

export async function runCronJobFetch(): Promise<{
  processed: number
  newItems: number
}> {
  const admin = createAdminClient()

  const { data: sources } = await admin
    .from('job_sources')
    .select('*')
    .eq('is_active', true)

  let newItems = 0
  let processed = 0

  for (const source of (sources ?? []) as JobSource[]) {
    processed += 1

    if (source.type === 'telegram') {
      continue
    }

    try {
      let items: Awaited<ReturnType<typeof fetchRssItems>> = []

      if (source.type === 'rss') {
        const config = source.config as { feed_url?: string }
        if (config.feed_url) {
          items = await fetchRssItems(config.feed_url)
        }
      } else if (source.type === 'linkedin') {
        const config = source.config as {
          search_query?: string
          location?: string
          job_type?: string
        }
        if (config.search_query) {
          items = await fetchLinkedInJobs({
            search_query: config.search_query,
            location: config.location,
            job_type: config.job_type,
          })
        }
      }

      for (const item of items) {
        const result = await insertImportedJobIfNew(source.id, source.type, item)
        if (result.inserted) {
          newItems += 1
          if (result.id) {
            const { processImportedJob } = await import(
              '@/lib/jobs/scraping/process-imported-job'
            )
            void processImportedJob(result.id)
          }
        }
      }

      await admin
        .from('job_sources')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', source.id)
    } catch (err) {
      console.error(`[cron-fetch] source ${source.id}:`, err)
    }
  }

  const aiProcessed = await processPendingImports(5)

  if (newItems > 0) {
    await notifyAllAdmins({
      title: `${newItems} new job(s) imported`,
      titleAr: `${newItems} وظيفة جديدة مستوردة`,
      body: 'Review imported jobs in the admin dashboard.',
      bodyAr: 'راجع الوظائف المستوردة في لوحة الإدارة.',
      type: 'imported_job',
    })
  }

  return { processed: processed + aiProcessed, newItems }
}
