import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { ScrapedJobItem } from '@/types/job-scraping'

export async function insertImportedJobIfNew(
  sourceId: string,
  sourceType: string,
  item: ScrapedJobItem
): Promise<{ inserted: boolean; id?: string }> {
  const admin = createAdminClient()

  if (item.source_post_id) {
    const { data: existing } = await admin
      .from('imported_jobs')
      .select('id')
      .eq('source_type', sourceType)
      .eq('source_post_id', item.source_post_id)
      .maybeSingle()

    if (existing) {
      return { inserted: false }
    }
  }

  const { data, error } = await admin
    .from('imported_jobs')
    .insert({
      source_id: sourceId,
      source_type: sourceType,
      raw_content: item.raw_content,
      source_url: item.source_url ?? null,
      source_post_id: item.source_post_id ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      return { inserted: false }
    }
    console.error('[import-job]', error?.message)
    return { inserted: false }
  }

  const { data: source } = await admin
    .from('job_sources')
    .select('total_imported')
    .eq('id', sourceId)
    .single()

  await admin
    .from('job_sources')
    .update({
      total_imported: (source?.total_imported ?? 0) + 1,
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', sourceId)

  return { inserted: true, id: data.id as string }
}

export async function findTelegramSourceByUsername(
  username: string
): Promise<{ id: string } | null> {
  const admin = createAdminClient()
  const normalized = username.replace(/^@/, '').toLowerCase()

  const { data: sources } = await admin
    .from('job_sources')
    .select('id, config')
    .eq('type', 'telegram')
    .eq('is_active', true)

  for (const source of sources ?? []) {
    const config = source.config as { channel_username?: string }
    const channel = config.channel_username?.replace(/^@/, '').toLowerCase()
    if (channel === normalized) {
      return { id: source.id as string }
    }
  }

  return null
}
