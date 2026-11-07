/**
 * Provider-agnostic object storage contract.
 *
 * The rest of the app depends only on this interface, never on a concrete
 * provider (R2, S3, etc.). Swap providers by changing the factory in
 * `provider.ts` — no call sites change. This is the seam that keeps the
 * Cloudflare migration roadmap (and future providers) low-risk.
 */

export interface PresignedPart {
  partNumber: number
  url: string
}

export interface CreateMultipartUploadInput {
  key: string
  contentType: string
  /** Number of parts the client will upload (>= 1). */
  partCount: number
  /** TTL for the presigned part URLs, in seconds. */
  partUrlTtlSeconds?: number
}

export interface CreateMultipartUploadResult {
  key: string
  uploadId: string
  parts: PresignedPart[]
}

export interface CompletedPart {
  partNumber: number
  etag: string
}

export interface CompleteMultipartUploadInput {
  key: string
  uploadId: string
  parts: CompletedPart[]
}

export interface SignedDownloadInput {
  key: string
  ttlSeconds?: number
  /** When set, forces a download filename via Content-Disposition. */
  downloadFilename?: string
}

export interface HeadObjectResult {
  size?: number
  contentType?: string
}

export interface GetObjectResult {
  body: {
    transformToWebStream(): ReadableStream
    transformToString(encoding?: string): Promise<string>
  }
  contentType?: string
  contentLength?: number
}

export interface StorageProvider {
  /** Stable identifier persisted on video_assets.storage_provider. */
  readonly providerId: string
  readonly bucketName: string

  createMultipartUpload(
    input: CreateMultipartUploadInput
  ): Promise<CreateMultipartUploadResult>

  completeMultipartUpload(
    input: CompleteMultipartUploadInput
  ): Promise<{ etag?: string }>

  abortMultipartUpload(input: { key: string; uploadId: string }): Promise<void>

  getSignedDownloadUrl(input: SignedDownloadInput): Promise<string>

  headObject(key: string): Promise<HeadObjectResult | null>

  getObject(key: string): Promise<GetObjectResult | null>

  deleteObject(key: string): Promise<void>

  /** Deletes every object under a prefix (e.g. a lesson folder). */
  deletePrefix(prefix: string): Promise<void>
}
