/**
 * Backfill Supabase Auth app_metadata RBAC claims from public.users.
 *
 * Usage:
 *   npm run auth:claims:dry-run
 *   npm run auth:claims:backfill
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createTimeoutFetch } from '../src/lib/supabase/fetch'
import { buildPlatformClaims } from '../src/lib/auth/claims-projection'
import type { UserRole } from '../src/types'
import type { OnboardingAccountType } from '../src/types/onboarding'

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
const batchSize = Number(process.env.CLAIMS_BACKFILL_BATCH ?? '50')
const batchDelayMs = Number(process.env.CLAIMS_BACKFILL_DELAY_MS ?? '200')

interface UserRow {
  id: string
  role: UserRole
  is_active: boolean
  account_type: OnboardingAccountType | null
  onboarding_completed: boolean
  onboarding_completed_at: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

function buildClaims(
  existing: Record<string, unknown>,
  row: UserRow
): Record<string, unknown> {
  return buildPlatformClaims(existing, row, false)
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: createTimeoutFetch(12_000) },
  })

  const { data: users, error } = await admin
    .from('users')
    .select(
      'id, role, is_active, account_type, onboarding_completed, onboarding_completed_at'
    )
    .order('created_at', { ascending: true })

  if (error || !users) {
    console.error('Failed to load users:', error?.message)
    process.exit(1)
  }

  let updated = 0
  let skipped = 0
  let failed = 0

  console.info(
    `${dryRun ? '[dry-run] ' : ''}Backfilling auth claims for ${users.length} users (batch=${batchSize})`
  )

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize) as UserRow[]

    for (const row of batch) {
      try {
        const { data: authData, error: authError } = await admin.auth.admin.getUserById(row.id)
        if (authError || !authData.user) {
          failed += 1
          console.error(`[fail] ${row.id}: auth user not found`)
          continue
        }

        const existing = (authData.user.app_metadata ?? {}) as Record<string, unknown>
        const next = buildClaims(existing, row)

        if (
          existing.role === next.role &&
          existing.is_active === next.is_active &&
          existing.account_type === next.account_type &&
          existing.onboarding_completed === next.onboarding_completed &&
          existing.claims_version === next.claims_version
        ) {
          skipped += 1
          continue
        }

        if (dryRun) {
          updated += 1
          console.info(`[dry-run] would update ${row.id} -> role=${row.role} active=${row.is_active}`)
          continue
        }

        const { error: updateError } = await admin.auth.admin.updateUserById(row.id, {
          app_metadata: next,
        })

        if (updateError) {
          failed += 1
          console.error(`[fail] ${row.id}: ${updateError.message}`)
          continue
        }

        updated += 1
      } catch (err) {
        failed += 1
        const message = err instanceof Error ? err.message : 'unknown'
        console.error(`[fail] ${row.id}: ${message}`)
      }
    }

    if (i + batchSize < users.length) {
      await sleep(batchDelayMs)
    }
  }

  console.info(
    JSON.stringify({
      total: users.length,
      updated,
      skipped,
      failed,
      dryRun,
    })
  )

  if (failed > 0) {
    process.exit(1)
  }
}

void main()
