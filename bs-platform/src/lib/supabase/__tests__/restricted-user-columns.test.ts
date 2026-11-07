import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { RESTRICTED_USER_COLUMNS } from '@/lib/supabase/restricted-user-columns'

/**
 * Guard for the defect class behind BS-100 and the /api/portfolio/settings 404.
 *
 * `public.users` has COLUMN-level grants: the `authenticated` role cannot read
 * 58 of its 99 columns. Naming one in a query made with the session (RLS)
 * client makes PostgREST reject the whole select with 42501 — and because most
 * call sites destructure only `data`, the failure surfaces as an empty result
 * rather than an error. Two user-visible "it's broken" reports came from this.
 *
 * This test fails the build if a new session-client query reads a restricted
 * column. The fix is always the same: read it via `createAdminClient()`, scoped
 * to the caller's own row.
 */

const SRC = join(process.cwd(), 'src')
const SESSION_CLIENT = /from '@\/lib\/supabase\/(server|client|public)'/
const SELECT_CALL = /\.select\(\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/g

// Files that legitimately read these columns through the service role while
// also importing a session client for auth.
const ALLOWLIST = new Set<string>([])  // no exceptions needed: the fixed read uses the service role

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

/**
 * Only the parts of a select that read `users`.
 *
 * A bare token scan produced false alarms: `company_name` is restricted on
 * `users` but perfectly readable on `jobs`, and most selects here embed several
 * tables. So take the top-level columns when the query is `.from('users')`, and
 * otherwise take only what is inside a `users(...)` / `alias:users!fk(...)`
 * embed.
 */
function usersColumnsIn(select: string, isFromUsers: boolean): string[] {
  const segments: string[] = []

  const embed = /(?:[A-Za-z_][A-Za-z0-9_]*\s*:\s*)?users(?:![A-Za-z_][A-Za-z0-9_]*)?\s*\(([^()]*)\)/g
  let m: RegExpExecArray | null
  let stripped = select
  while ((m = embed.exec(select))) {
    segments.push(m[1])
    stripped = stripped.replace(m[0], '')
  }

  if (isFromUsers) {
    // Drop every other table's embed before reading the top-level columns.
    segments.push(stripped.replace(/[A-Za-z_][A-Za-z0-9_]*\s*(?:![A-Za-z_][A-Za-z0-9_]*)?\s*\([^()]*\)/g, ''))
  }

  return segments.flatMap((seg) => seg.split(',').map((c) => c.trim()))
}

function restrictedTokens(select: string, isFromUsers: boolean): string[] {
  const cols = new Set(usersColumnsIn(select, isFromUsers))
  return RESTRICTED_USER_COLUMNS.filter((c) => cols.has(c))
}

describe('restricted users columns are never read with the session client', () => {
  it('exports the live grant list', () => {
    expect(RESTRICTED_USER_COLUMNS.length).toBeGreaterThan(0)
    expect(RESTRICTED_USER_COLUMNS).toContain('expected_salary_amount')
    expect(RESTRICTED_USER_COLUMNS).toContain('portfolio_template_id')
  })

  it('finds no new session-client select naming one', () => {
    const offenders: string[] = []

    for (const file of walk(SRC)) {
      const rel = file.slice(process.cwd().length + 1)
      if (ALLOWLIST.has(rel)) continue

      const source = readFileSync(file, 'utf8')
      if (!SESSION_CLIENT.test(source)) continue
      if (!/\.from\('users'\)|users!|users\(/.test(source)) continue

      SELECT_CALL.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = SELECT_CALL.exec(source))) {
        const select = match[1] ?? match[2] ?? match[3] ?? ''
        const before = source.slice(0, match.index)

        // Is THIS select reading the users table directly?
        const isFromUsers = /\.from\('users'\)[^)]*$/.test(before.slice(-200))
        if (!isFromUsers && !/users\s*(?:![A-Za-z_][A-Za-z0-9_]*)?\s*\(/.test(select)) continue

        const hits = restrictedTokens(select, isFromUsers)
        if (hits.length === 0) continue

        // Resolve the RECEIVER of this query, not merely the nearest client
        // construction in the file — several modules build both an admin and a
        // session client, and only the variable actually used matters.
        // Take the LAST `x.from('table')` before this select — a global scan,
        // because a single non-global match would anchor on the first one in
        // the file and attribute the query to the wrong client.
        const fromCalls = [
          ...before.matchAll(/([A-Za-z_$][\w$]*)\s*(?:\r?\n\s*)?\.from\(\s*'[^']+'\s*\)/g),
        ]
        const receiver = fromCalls.at(-1)?.[1]

        const usesAdmin = receiver
          ? new RegExp(
              `(?:const|let)\\s+${receiver}\\s*=\\s*(?:await\\s+)?createAdminClient\\(`
            ).test(source)
          : false
        if (usesAdmin) continue
        // Inline form: `await createAdminClient().from('users')`
        if (/createAdminClient\(\s*\)\s*(?:\r?\n\s*)?\.from\([\s\S]*$/.test(before)) continue

        offenders.push(`${rel} -> ${hits.join(', ')}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
