import { FutureVideoProviderStub } from '@/lib/video-providers/providers/future/base-stub'

export class MuxVideoProviderStub extends FutureVideoProviderStub {
  readonly id = 'mux' as const
  readonly displayName = 'Mux'
}
