import 'server-only'

import type { VideoAsset } from '@/types'
import type { VideoProvider } from '@/lib/video-providers/provider-interface'
import {
  createVideoProvider,
  isVideoProviderId,
} from '@/lib/video-providers/provider-registry'
import type { VideoProviderId } from '@/lib/video-providers/types'
import { getDefaultUploadProviderId, getProviderSettings } from '@/lib/video-providers/provider-settings'

const providerCache = new Map<VideoProviderId, VideoProvider>()

export function resolveAssetProviderId(asset: VideoAsset): VideoProviderId {
  if (asset.provider && isVideoProviderId(asset.provider)) {
    return asset.provider
  }
  if (asset.storage_provider === 'r2') return 'r2'
  if (isVideoProviderId(asset.storage_provider)) {
    return asset.storage_provider
  }
  return 'r2'
}

export async function getVideoProvider(id: VideoProviderId): Promise<VideoProvider> {
  let provider = providerCache.get(id)
  if (!provider) {
    provider = createVideoProvider(id)
    await provider.initialize()
    providerCache.set(id, provider)
  }
  return provider
}

export async function getVideoProviderForAsset(asset: VideoAsset): Promise<VideoProvider> {
  return getVideoProvider(resolveAssetProviderId(asset))
}

export async function getDefaultUploadProvider(): Promise<VideoProvider> {
  const id = await getDefaultUploadProviderId()
  return getVideoProvider(id)
}

export async function getPrimaryProvider(): Promise<VideoProvider | null> {
  const settings = await getProviderSettings()
  const primary = settings.find((s) => s.is_primary && s.enabled)
  if (!primary) return null
  return getVideoProvider(primary.provider_id)
}

export async function getEnabledProviders(): Promise<VideoProvider[]> {
  const settings = await getProviderSettings()
  const enabled = settings.filter((s) => s.enabled).sort((a, b) => a.priority - b.priority)
  return Promise.all(enabled.map((s) => getVideoProvider(s.provider_id)))
}

/** Test hook — clears cached provider instances. */
export function clearVideoProviderCache(): void {
  providerCache.clear()
}
