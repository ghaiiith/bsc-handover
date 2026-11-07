import { getPlatformSettings } from '@/lib/admin/platform-settings'
import { getSessionProfile } from '@/lib/auth/profile'
import LeadPopup from '@/components/tracking/LeadPopup'

/**
 * Server gate for the exit-intent pop-up: renders nothing unless the admin
 * turned it on, and never for a signed-in account (they are already captured).
 */
export default async function LeadPopupGate() {
  const s = await getPlatformSettings()
  if (s.lead_popup_enabled !== 'true') return null
  const session = await getSessionProfile()
  if (session) return null

  let copy: Record<string, string> = {}
  try {
    const parsed = JSON.parse(s.lead_popup_copy || '{}')
    if (parsed && typeof parsed === 'object') copy = parsed
  } catch {
    /* fall back to translations */
  }
  return <LeadPopup copy={copy} isLoggedIn={false} />
}
