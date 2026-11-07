import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateJobsListingCache } from '@/lib/cache/invalidate-listing-cache'

/**
 * External job feed (Iraqi Job Pool). Unlike the telegram/RSS scrapers this
 * source returns already-structured jobs, so there is no AI parsing step — each
 * item maps straight to a job. Items flow through the existing imported_jobs
 * review pipeline; when the source's config has auto_publish they go live
 * immediately, otherwise they wait in the admin review queue.
 *
 * Paginates newest-first and dedupes on (source_type='api', source_post_id=id),
 * so re-runs only pick up new postings. Capped per run so a first sync over
 * thousands of rows can't time out — the cron catches up on later runs.
 */

const PAGE_SIZE = 200
const MAX_JOBS_PER_RUN = 400
const FETCH_TIMEOUT_MS = 20_000
const VALID_JOB_TYPES = new Set(['full_time', 'part_time', 'remote', 'hybrid', 'internship'])

interface ExternalJob {
  id: number
  title_ar?: string | null
  title_en?: string | null
  company_name?: string | null
  city?: string | null
  job_type?: string | null
  salary_min_iqd?: number | null
  salary_max_iqd?: number | null
  application_deadline?: string | null
  required_skills?: string[] | null
  description_ar?: string | null
  description_en?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  whatsapp_number?: string | null
  application_url?: string | null
  source_posted_at?: string | null
  telegram_source?: { channel_title?: string; permalink?: string } | null
}

interface ExternalPage {
  items: ExternalJob[]
  total: number
  limit: number
  offset: number
}

export interface ExternalFetchResult {
  ok: boolean
  fetched: number
  imported: number
  duplicates: number
  skipped: number
  autoPublished: boolean
  error?: string
}

function pad(text: string, min: number, suffix: string): string {
  const t = text.trim()
  return t.length >= min ? t : `${t}\n\n${suffix}`.trim()
}

async function fetchPage(baseUrl: string, reviewStatus: string, offset: number): Promise<ExternalPage | null> {
  const url = `${baseUrl.replace(/\/$/, '')}?review_status=${encodeURIComponent(reviewStatus)}&limit=${PAGE_SIZE}&offset=${offset}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return (await res.json()) as ExternalPage
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Map one external item to our jobs-table row. Returns null if unusable. */
function toJobRow(item: ExternalJob, adminId: string | null) {
  const title = (item.title_en || item.title_ar || '').trim()
  const titleAr = (item.title_ar || item.title_en || '').trim()
  if (!title && !titleAr) return null

  const permalink = item.telegram_source?.permalink ?? null
  const descEn = (item.description_en || item.description_ar || title || '').trim()
  const descAr = (item.description_ar || item.description_en || titleAr || '').trim()

  const jobType = item.job_type && VALID_JOB_TYPES.has(item.job_type) ? item.job_type : 'full_time'
  const whatsapp = (item.whatsapp_number || '').replace(/\D/g, '') || null
  // A job must be reachable somehow; the Telegram permalink is the last resort.
  const contactLink = item.application_url || permalink || null
  const contactEmail = item.contact_email || null
  const contactPhone = item.contact_phone || null
  if (!contactEmail && !contactPhone && !contactLink && !whatsapp) return null

  return {
    admin_id: adminId,
    title: title || titleAr,
    title_ar: titleAr || title,
    company_name: (item.company_name || 'غير معروف').slice(0, 200),
    city: (item.city || 'بغداد').slice(0, 100),
    job_type: jobType,
    salary_min: typeof item.salary_min_iqd === 'number' ? item.salary_min_iqd : null,
    salary_max: typeof item.salary_max_iqd === 'number' ? item.salary_max_iqd : null,
    skills: (item.required_skills ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 15),
    description: pad(descEn || titleAr, 30, '(مستورد من مصدر خارجي — يحتاج مراجعة)'),
    description_ar: pad(descAr || title, 30, '(مستورد من مصدر خارجي — يحتاج مراجعة)'),
    deadline: item.application_deadline || null,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    contact_link: contactLink,
    whatsapp_number: whatsapp,
    // Report BS-62/79: EVERY job from this feed is externally sourced. Without
    // this flag the job detail page shows the in-platform Apply box and any
    // application sent through it is silently lost (the employer never sees it).
    is_external: true,
  }
}

export async function fetchExternalJobs(sourceId?: string): Promise<ExternalFetchResult> {
  const admin = createAdminClient()

  const { data: source } = sourceId
    ? await admin.from('job_sources').select('*').eq('id', sourceId).maybeSingle()
    : await admin.from('job_sources').select('*').eq('type', 'api').eq('is_active', true).order('created_at').limit(1).maybeSingle()

  if (!source) return { ok: false, fetched: 0, imported: 0, duplicates: 0, skipped: 0, autoPublished: false, error: 'no_api_source' }

  const config = (source.config ?? {}) as {
    url?: string
    review_status?: string
    auto_publish?: boolean
    cursor_offset?: number
  }
  const baseUrl = config.url ?? 'https://iraqijobpool-production.up.railway.app/api/jobs'
  const reviewStatus = config.review_status ?? 'ready'
  const autoPublish = config.auto_publish === true

  const { data: admins } = await admin.from('users').select('id').eq('role', 'admin').limit(1)
  const adminId = (admins?.[0]?.id as string | undefined) ?? null

  const nowIso = new Date().toISOString()
  const jobExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  let fetched = 0
  let imported = 0
  let duplicates = 0
  let skipped = 0
  let total = Infinity

  const importItem = async (item: ExternalJob): Promise<void> => {
    fetched += 1
    const postId = String(item.id)

    const { data: existing } = await admin
      .from('imported_jobs')
      .select('id')
      .eq('source_type', 'api')
      .eq('source_post_id', postId)
      .maybeSingle()
    if (existing) {
      duplicates += 1
      return
    }

    const jobRow = toJobRow(item, adminId)
    if (!jobRow) {
      skipped += 1
      return
    }

    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .insert({
        ...jobRow,
        status: autoPublish ? 'active' : 'draft',
        expires_at: autoPublish ? jobExpiry : null,
      })
      .select('id')
      .single()

    if (jobErr || !job) {
      skipped += 1
      return
    }

    await admin.from('imported_jobs').insert({
      source_id: source.id,
      source_type: 'api',
      raw_content: JSON.stringify(item).slice(0, 8000),
      source_url: item.telegram_source?.permalink ?? null,
      source_post_id: postId,
      ai_processed: true,
      ai_result: { ...jobRow, is_job_posting: true, confidence: 1 },
      status: autoPublish ? 'published' : 'reviewed',
      reviewed_at: autoPublish ? nowIso : null,
      published_job_id: job.id,
    })
    imported += 1
  }

  // Freshness pass: the newest page first, so new postings appear promptly.
  const freshPage = await fetchPage(baseUrl, reviewStatus, 0)
  if (freshPage?.items?.length) {
    total = freshPage.total ?? freshPage.items.length
    for (const item of freshPage.items) await importItem(item)
  }

  // Backfill pass: walk the rest of the feed across runs via a persisted cursor,
  // so the whole archive gets ingested and then the cursor wraps to keep cycling.
  // The DB dedup makes any overlap with the freshness pass harmless.
  let cursor = Number.isFinite(config.cursor_offset) ? (config.cursor_offset as number) : PAGE_SIZE
  if (cursor < PAGE_SIZE) cursor = PAGE_SIZE

  while (fetched < MAX_JOBS_PER_RUN && cursor < total) {
    const page = await fetchPage(baseUrl, reviewStatus, cursor)
    if (!page?.items?.length) break
    total = page.total ?? total
    for (const item of page.items) await importItem(item)
    cursor += PAGE_SIZE
  }
  // Wrap the cursor once we've swept the whole feed.
  if (cursor >= total) cursor = PAGE_SIZE

  await admin
    .from('job_sources')
    .update({
      last_checked_at: nowIso,
      total_imported: (source.total_imported ?? 0) + imported,
      config: { ...config, cursor_offset: cursor },
    })
    .eq('id', source.id)

  if (imported > 0 && autoPublish) revalidateJobsListingCache()

  return { ok: true, fetched, imported, duplicates, skipped, autoPublished: autoPublish }
}
