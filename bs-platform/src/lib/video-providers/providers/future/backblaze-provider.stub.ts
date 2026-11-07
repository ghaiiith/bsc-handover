import { FutureVideoProviderStub } from '@/lib/video-providers/providers/future/base-stub'

export class BackblazeVideoProviderStub extends FutureVideoProviderStub {
  readonly id = 'backblaze' as const
  readonly displayName = 'Backblaze B2'
}
