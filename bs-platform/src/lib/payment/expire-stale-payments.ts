import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { failPayment } from '@/lib/payment/complete-payment'

/** A checkout the buyer never completed is abandoned after this long. */
const STALE_AFTER_MINUTES = 60

/**
 * Report BS-55: a buyer who abandons the gateway leaves a `pending` payment and
 * (for services) a `pending` order behind forever — the seller sees phantom work
 * and the buyer can be blocked from re-ordering. Nothing ever cleaned these up
 * because failPayment only ran on a terminal-failure webhook. This marks them
 * failed so the state matches reality.
 */
export async function expireStalePayments(): Promise<{ expired: number }> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000).toISOString()

  const { data: stale } = await admin
    .from('payments')
    .select('reference_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .limit(200)

  let expired = 0
  for (const row of stale ?? []) {
    const ref = row.reference_id as string | null
    if (!ref) continue
    try {
      await failPayment(ref)
      expired += 1
    } catch (err) {
      console.error('[payments/expire-stale] failed for', ref, err)
    }
  }
  return { expired }
}
