import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_PROVIDER_IDS } from '@/lib/video-providers/provider-registry'
import { getVideoProvider } from '@/lib/video-providers/provider-factory'
import { updateProviderSetting } from '@/lib/video-providers/provider-settings'
import type { VideoProviderId } from '@/lib/video-providers/types'

export async function runProviderHealthChecks(): Promise<void> {
  const admin = createAdminClient()

  for (const providerId of ALL_PROVIDER_IDS) {
    try {
      const provider = await getVideoProvider(providerId)
      const result = await provider.healthCheck()

      await admin.from('provider_health_logs').insert({
        provider_id: providerId,
        status: result.status,
        latency_ms: result.latencyMs,
        api_response_ms: result.apiResponseMs,
        upload_response_ms: result.uploadResponseMs,
        playback_response_ms: result.playbackResponseMs,
        storage_status: result.storageStatus,
        error: result.error,
      })

      await updateProviderSetting(providerId as VideoProviderId, {
        status: result.status,
        last_health_check: result.checkedAt,
        last_error: result.error ?? null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'health check failed'
      await admin.from('provider_health_logs').insert({
        provider_id: providerId,
        status: 'offline',
        error: message,
      })
      await updateProviderSetting(providerId as VideoProviderId, {
        status: 'offline',
        last_error: message,
        last_health_check: new Date().toISOString(),
      })
    }
  }
}

export async function getProviderHealthHistory(
  providerId: VideoProviderId,
  limit = 50
) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('provider_health_logs')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}
