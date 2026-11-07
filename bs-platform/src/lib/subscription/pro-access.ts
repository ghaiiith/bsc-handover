import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings } from '@/lib/admin/platform-settings'

/**
 * Report BS-49: AI features gated behind the Pro tier. Which feature groups are
 * gated is admin-configurable (platform_settings.ai_pro_features); who counts as
 * Pro is: an admin, an account with pro_until in the future, or a company with an
 * active employer subscription.
 */

export type ProFeature = 'ai_cv' | 'ai_course' | 'ai_matching'

export const PRO_FEATURES: { key: ProFeature; labelKey: string }[] = [
  { key: 'ai_cv', labelKey: 'pro_feature_ai_cv' },
  { key: 'ai_course', labelKey: 'pro_feature_ai_course' },
  { key: 'ai_matching', labelKey: 'pro_feature_ai_matching' },
]

function parseGatedFeatures(raw: string | undefined): ProFeature[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((f): f is ProFeature =>
      PRO_FEATURES.some((p) => p.key === f)
    )
  } catch {
    return []
  }
}

export async function getGatedFeatures(): Promise<ProFeature[]> {
  const settings = await getPlatformSettings()
  return parseGatedFeatures(settings.ai_pro_features)
}

export async function isFeatureProGated(feature: ProFeature): Promise<boolean> {
  return (await getGatedFeatures()).includes(feature)
}

/** True when the account currently has Pro access. */
export async function isProUser(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: user } = await admin
    .from('users')
    .select('role, pro_until')
    .eq('id', userId)
    .maybeSingle()

  if (!user) return false
  if (user.role === 'admin') return true
  if (user.pro_until && new Date(user.pro_until as string).getTime() > Date.now()) return true

  // Companies on an active employer subscription get Pro AI (e.g. matching).
  if (user.role === 'company') {
    const { data: sub } = await admin
      .from('employer_subscriptions')
      .select('id, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (
      sub &&
      (!sub.current_period_end ||
        new Date(sub.current_period_end as string).getTime() > Date.now())
    ) {
      return true
    }
  }

  return false
}

export interface ProAccessResult {
  allowed: boolean
  /** Set when blocked — the client shows an upgrade prompt for this feature. */
  reason?: 'pro_required'
  feature?: ProFeature
}

/**
 * The single gate every AI entry point calls. Allowed when the feature is not
 * gated, or the user is Pro. Fails CLOSED only for the gate decision — an infra
 * error reading settings/Pro status blocks (so a paid feature can't leak), but
 * callers already 401 on missing auth first.
 */
export async function checkProAccess(
  userId: string,
  feature: ProFeature
): Promise<ProAccessResult> {
  const gated = await isFeatureProGated(feature)
  if (!gated) return { allowed: true }
  const pro = await isProUser(userId)
  if (pro) return { allowed: true }
  return { allowed: false, reason: 'pro_required', feature }
}
