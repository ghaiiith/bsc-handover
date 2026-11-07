import 'server-only'

import type { VideoProvider } from '@/lib/video-providers/provider-interface'
import type { VideoProviderId } from '@/lib/video-providers/types'
import { R2VideoProvider } from '@/lib/video-providers/providers/r2-provider'
import { VimeoVideoProvider } from '@/lib/video-providers/providers/vimeo-provider'
import { AwsVideoProviderStub } from '@/lib/video-providers/providers/future/aws-provider.stub'
import { BackblazeVideoProviderStub } from '@/lib/video-providers/providers/future/backblaze-provider.stub'
import { MuxVideoProviderStub } from '@/lib/video-providers/providers/future/mux-provider.stub'
import { BunnyVideoProviderStub } from '@/lib/video-providers/providers/future/bunny-provider.stub'
import { CloudinaryVideoProviderStub } from '@/lib/video-providers/providers/future/cloudinary-provider.stub'

const REGISTRY: Record<VideoProviderId, () => VideoProvider> = {
  vimeo: () => new VimeoVideoProvider(),
  r2: () => new R2VideoProvider(),
  aws: () => new AwsVideoProviderStub(),
  backblaze: () => new BackblazeVideoProviderStub(),
  mux: () => new MuxVideoProviderStub(),
  bunny: () => new BunnyVideoProviderStub(),
  cloudinary: () => new CloudinaryVideoProviderStub(),
}

export const ALL_PROVIDER_IDS: VideoProviderId[] = [
  'vimeo',
  'r2',
  'aws',
  'backblaze',
  'mux',
  'bunny',
  'cloudinary',
]

export function isVideoProviderId(value: string): value is VideoProviderId {
  return ALL_PROVIDER_IDS.includes(value as VideoProviderId)
}

export function createVideoProvider(id: VideoProviderId): VideoProvider {
  const factory = REGISTRY[id]
  if (!factory) {
    throw new Error(`Unknown video provider: ${id}`)
  }
  return factory()
}

export function listRegisteredProviders(): VideoProviderId[] {
  return [...ALL_PROVIDER_IDS]
}
