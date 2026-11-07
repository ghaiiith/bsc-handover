export type ProxyAuthMetricEvent =
  | 'claims_used'
  | 'db_fallback_used'
  | 'claims_missing'
  | 'claims_stale'
  | 'db_fallback_failed'
  | 'inactive_user_redirected'
  | 'role_denied'
  | 'unauthenticated_protected'
  | 'claims_sync_scheduled'
  | 'onboarding_redirected'
  | 'onboarding_missing_claim'
  | 'public_landing_allowed'
  | 'auth_required_redirect'
  | 'personalized_home_redirect'
  | 'session_superseded'
  | 'session_superseded_prefetch_skipped'

export interface ProxyAuthMetricDetail {
  path?: string
  reason?: string
  role?: string | null
}

export function logProxyAuthMetric(
  event: ProxyAuthMetricEvent,
  detail: ProxyAuthMetricDetail = {}
): void {
  const payload = {
    event,
    ...detail,
  }

  if (process.env.NODE_ENV === 'development') {
    console.info('[proxy/auth]', JSON.stringify(payload))
    return
  }

  console.info('[proxy/auth]', JSON.stringify(payload))
}
