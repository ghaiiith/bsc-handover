import { FutureVideoProviderStub } from '@/lib/video-providers/providers/future/base-stub'

export class BunnyVideoProviderStub extends FutureVideoProviderStub {
  readonly id = 'bunny' as const
  readonly displayName = 'Bunny Stream'
}
