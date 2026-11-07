import { FutureVideoProviderStub } from '@/lib/video-providers/providers/future/base-stub'

export class CloudinaryVideoProviderStub extends FutureVideoProviderStub {
  readonly id = 'cloudinary' as const
  readonly displayName = 'Cloudinary Video'
}
