/**
 * Wipe all database data (public tables + auth users).
 *
 * Preferred: run supabase/scripts/wipe-all-data.sql in Supabase SQL Editor.
 *
 * This script uses the service role to delete rows table-by-table + auth users via Admin API.
 * Usage:
 *   npm run db:wipe:dry-run
 *   npm run db:wipe -- --confirm
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
// @ts-nocheck -- ops-only script; supabase-js generic inference breaks under strict tsc

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createTimeoutFetch } from '../src/lib/supabase/fetch'

function loadEnvFile(filename: string): void {
  const filePath = resolve(process.cwd(), filename)
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const dryRun = process.argv.includes('--dry-run')
const confirmed = process.argv.includes('--confirm')

/** Child tables first — safe DELETE order when not using TRUNCATE SQL */
const DELETE_ORDER: Array<{ table: string; column: string }> = [
  { table: 'lesson_qa_messages', column: 'id' },
  { table: 'lesson_qa_threads', column: 'id' },
  { table: 'lesson_bookmarks', column: 'id' },
  { table: 'video_security_logs', column: 'id' },
  { table: 'playback_sessions', column: 'id' },
  { table: 'lesson_content_protection', column: 'id' },
  { table: 'lesson_encryption_keys', column: 'id' },
  { table: 'provider_health_logs', column: 'id' },
  { table: 'portfolio_views', column: 'id' },
  { table: 'community_ai_search_logs', column: 'id' },
  { table: 'discount_logs', column: 'id' },
  { table: 'coupon_redemptions', column: 'id' },
  { table: 'discount_offer_courses', column: 'offer_id' },
  { table: 'discount_offers', column: 'id' },
  { table: 'course_discounts', column: 'id' },
  { table: 'coupons', column: 'id' },
  { table: 'quiz_attempts', column: 'id' },
  { table: 'quiz_questions', column: 'id' },
  { table: 'assignment_submissions', column: 'id' },
  { table: 'lesson_discussions', column: 'id' },
  { table: 'lesson_progress', column: 'id' },
  { table: 'course_completions', column: 'id' },
  { table: 'final_exam_submissions', column: 'id' },
  { table: 'certificates', column: 'id' },
  { table: 'course_wishlists', column: 'id' },
  { table: 'reviews', column: 'id' },
  { table: 'notifications', column: 'id' },
  { table: 'fcm_tokens', column: 'id' },
  { table: 'job_applications', column: 'id' },
  { table: 'imported_jobs', column: 'id' },
  { table: 'instructor_requests', column: 'id' },
  { table: 'company_affiliation_requests', column: 'id' },
  { table: 'freelancer_requests', column: 'id' },
  { table: 'cv_exports', column: 'id' },
  { table: 'cv_profiles', column: 'id' },
  { table: 'course_resources', column: 'id' },
  { table: 'course_assignments', column: 'id' },
  { table: 'course_quizzes', column: 'id' },
  { table: 'video_assets', column: 'id' },
  { table: 'lessons', column: 'id' },
  { table: 'course_sections', column: 'id' },
  { table: 'enrollments', column: 'id' },
  { table: 'service_orders', column: 'id' },
  { table: 'payments', column: 'id' },
  { table: 'courses', column: 'id' },
  { table: 'services', column: 'id' },
  { table: 'jobs', column: 'id' },
  { table: 'instructor_revenue_agreements', column: 'id' },
  { table: 'rate_limits', column: 'bucket' },
  { table: 'job_sources', column: 'id' },
  { table: 'users', column: 'id' },
  { table: 'platform_settings', column: 'key' },
  { table: 'payment_gateway_configs', column: 'gateway_id' },
  { table: 'video_provider_settings', column: 'provider_id' },
  { table: 'course_categories', column: 'id' },
]

const DUMMY_UUID = '00000000-0000-0000-0000-000000000001'
const DUMMY_TEXT = '__wipe_all_data_sentinel__'

async function breakPaymentServiceOrderCycle(
  admin: ReturnType<typeof createClient>
): Promise<void> {
  await admin.from('payments').update({ service_order_id: null }).not('id', 'is', null)
  await admin.from('service_orders').update({ payment_id: null }).not('id', 'is', null)
}

async function deleteAllFromTable(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: string
): Promise<{ table: string; ok: boolean; error?: string }> {
  const sentinel = column === 'id' ? DUMMY_UUID : DUMMY_TEXT
  const { error, count } = await admin
    .from(table)
    .delete({ count: 'exact' })
    .neq(column, sentinel)

  if (error) {
    // Table may not exist on older schemas — treat as skip
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return { table, ok: true }
    }
    return { table, ok: false, error: error.message }
  }

  return { table, ok: true, error: count !== null ? `deleted ${count}` : undefined }
}

async function deleteAllAuthUsers(
  admin: ReturnType<typeof createClient>
): Promise<number> {
  let total = 0
  let page = 1
  const perPage = 200

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`auth listUsers failed: ${error.message}`)

    const users = data.users ?? []
    if (users.length === 0) break

    for (const user of users) {
      const { error: delError } = await admin.auth.admin.deleteUser(user.id)
      if (delError) {
        throw new Error(`deleteUser ${user.id}: ${delError.message}`)
      }
      total += 1
    }

    if (users.length < perPage) break
    page += 1
  }

  return total
}

async function main(): Promise<void> {
  if (!dryRun && !confirmed) {
    console.error(`
⚠️  This permanently deletes ALL users, courses, and every row in public tables.

Dry run:  npm run db:wipe:dry-run
Execute:  npm run db:wipe -- --confirm

Or run supabase/scripts/wipe-all-data.sql in Supabase SQL Editor (recommended).
`)
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (dryRun) {
    console.info('[dry-run] Would wipe all public data + auth.users')
    console.info('Tables:', DELETE_ORDER.map((t) => t.table).join(', '))
    if (url && serviceKey) console.info('Would use service role + auth admin API')
    else console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.info('\nRecommended: run supabase/scripts/wipe-all-data.sql in Supabase SQL Editor (faster, TRUNCATE).')
    process.exit(url && serviceKey ? 0 : 1)
  }

  if (!url || !serviceKey) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
    console.error('Or run supabase/scripts/wipe-all-data.sql in Supabase SQL Editor.')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: createTimeoutFetch(30_000) },
  })

  console.info('Wiping public tables (row deletes)...')
  console.info('Breaking payments ↔ service_orders foreign keys...')
  await breakPaymentServiceOrderCycle(admin)

  for (const { table, column } of DELETE_ORDER) {
    const result = await deleteAllFromTable(admin, table, column)
    if (!result.ok) {
      console.warn(`[skip/fail] ${table}: ${result.error}`)
    } else {
      console.info(`[ok] ${table}${result.error ? ` (${result.error})` : ''}`)
    }
  }

  console.info('Deleting auth users...')
  const authDeleted = await deleteAllAuthUsers(admin)
  console.info(`Done. Deleted ${authDeleted} auth user(s).`)
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Wipe failed:', message)
  console.error('\nFallback: run supabase/scripts/wipe-all-data.sql in Supabase SQL Editor.')
  process.exit(1)
})
