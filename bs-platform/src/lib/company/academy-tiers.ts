import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { parseSeatTiers, type SeatTier } from '@/lib/company/academy-pricing'

/**
 * Report BS-70: read the Company Academy seat tiers straight from
 * platform_settings (not the cached getPlatformSettings) so bulk pricing always
 * reflects the admin's current configuration — stale pricing must never be used
 * to charge a company.
 */
export async function getAcademySeatTiers(): Promise<SeatTier[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'academy_seat_tiers')
    .maybeSingle()
  return parseSeatTiers(data?.value)
}
