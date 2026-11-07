import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { ProviderSettingsRow, VideoProviderId } from '@/lib/video-providers/types'
import { isVideoProviderId } from '@/lib/video-providers/provider-registry'

function mapRow(row: Record<string, unknown>): ProviderSettingsRow {
  return {
    provider_id: row.provider_id as VideoProviderId,
    enabled: Boolean(row.enabled),
    is_primary: Boolean(row.is_primary),
    priority: Number(row.priority ?? 100),
    status: (row.status as ProviderSettingsRow['status']) ?? 'offline',
    region: (row.region as string | null) ?? null,
    settings: (row.settings as Record<string, unknown>) ?? {},
    last_health_check: (row.last_health_check as string | null) ?? null,
    last_error: (row.last_error as string | null) ?? null,
    estimated_monthly_cost_usd: Number(row.estimated_monthly_cost_usd ?? 0),
    estimated_storage_cost_usd: Number(row.estimated_storage_cost_usd ?? 0),
    estimated_streaming_cost_usd: Number(row.estimated_streaming_cost_usd ?? 0),
    estimated_upload_cost_usd: Number(row.estimated_upload_cost_usd ?? 0),
    estimated_api_cost_usd: Number(row.estimated_api_cost_usd ?? 0),
  }
}

export async function getProviderSettings(): Promise<ProviderSettingsRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('video_provider_settings')
    .select('*')
    .order('priority', { ascending: true })

  return (data ?? []).map(mapRow)
}

export async function getProviderSetting(
  providerId: VideoProviderId
): Promise<ProviderSettingsRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('video_provider_settings')
    .select('*')
    .eq('provider_id', providerId)
    .maybeSingle()

  return data ? mapRow(data) : null
}

export async function getDefaultUploadProviderId(): Promise<VideoProviderId> {
  return resolveUploadProviderId()
}

export interface UploadProviderContext {
  courseId?: string
  lessonId?: string
}

/** Resolves provider: lesson override → course override → global default. */
export async function resolveUploadProviderId(
  context: UploadProviderContext = {}
): Promise<VideoProviderId> {
  const admin = createAdminClient()

  if (context.lessonId) {
    const { data: lesson } = await admin
      .from('lessons')
      .select('video_upload_provider, course_id')
      .eq('id', context.lessonId)
      .maybeSingle()

    const lessonProvider = lesson?.video_upload_provider as string | null
    if (lessonProvider && isVideoProviderId(lessonProvider)) {
      const setting = await getProviderSetting(lessonProvider)
      if (setting?.enabled) return lessonProvider
    }

    const courseId = context.courseId ?? (lesson?.course_id as string | undefined)
    if (courseId) {
      const { data: course } = await admin
        .from('courses')
        .select('video_upload_provider')
        .eq('id', courseId)
        .maybeSingle()

      const courseProvider = course?.video_upload_provider as string | null
      if (courseProvider && isVideoProviderId(courseProvider)) {
        const setting = await getProviderSetting(courseProvider)
        if (setting?.enabled) return courseProvider
      }
    }
  } else if (context.courseId) {
    const { data: course } = await admin
      .from('courses')
      .select('video_upload_provider')
      .eq('id', context.courseId)
      .maybeSingle()

    const courseProvider = course?.video_upload_provider as string | null
    if (courseProvider && isVideoProviderId(courseProvider)) {
      const setting = await getProviderSetting(courseProvider)
      if (setting?.enabled) return courseProvider
    }
  }

  const { data: pref } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'default_video_upload_provider')
    .maybeSingle()

  const preferred = pref?.value as string | undefined
  if (preferred && isVideoProviderId(preferred)) {
    const setting = await getProviderSetting(preferred)
    if (setting?.enabled) return preferred
  }

  const settings = await getProviderSettings()
  const primary = settings.find((s) => s.is_primary && s.enabled)
  if (primary) return primary.provider_id

  const r2 = settings.find((s) => s.provider_id === 'r2' && s.enabled)
  if (r2) return 'r2'

  return 'vimeo'
}

export async function updateProviderSetting(
  providerId: VideoProviderId,
  updates: Partial<Omit<ProviderSettingsRow, 'provider_id'>>
): Promise<ProviderSettingsRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('video_provider_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('provider_id', providerId)
    .select('*')
    .single()

  if (error || !data) return null
  return mapRow(data)
}

export async function setPrimaryProvider(providerId: VideoProviderId): Promise<void> {
  const admin = createAdminClient()
  await admin.from('video_provider_settings').update({ is_primary: false })
  await admin
    .from('video_provider_settings')
    .update({ is_primary: true, enabled: true, updated_at: new Date().toISOString() })
    .eq('provider_id', providerId)
  await admin
    .from('platform_settings')
    .upsert({ key: 'default_video_upload_provider', value: providerId })
}
