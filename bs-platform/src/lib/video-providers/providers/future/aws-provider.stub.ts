import { FutureVideoProviderStub } from '@/lib/video-providers/providers/future/base-stub'

export class AwsVideoProviderStub extends FutureVideoProviderStub {
  readonly id = 'aws' as const
  readonly displayName = 'AWS S3'
}
