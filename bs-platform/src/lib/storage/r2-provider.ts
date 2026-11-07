import 'server-only'

import {
  S3Client,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  UploadPartCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  CompleteMultipartUploadInput,
  CreateMultipartUploadInput,
  CreateMultipartUploadResult,
  GetObjectResult,
  HeadObjectResult,
  SignedDownloadInput,
  StorageProvider,
} from '@/lib/storage/provider-types'

export interface R2ProviderConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  endpoint: string
  /** Optional custom CDN domain mapped to the bucket. Unused for signed URLs. */
  publicBaseUrl?: string
  defaultDownloadTtlSeconds: number
  defaultPartUrlTtlSeconds: number
  maxAttempts: number
  connectionTimeoutMs: number
  requestTimeoutMs: number
}

/**
 * Cloudflare R2 storage provider via the S3-compatible API.
 * Uploads use presigned multipart URLs; playback uses presigned GET URLs.
 * No object is ever public — every access is short-lived and signed.
 */
export class R2StorageProvider implements StorageProvider {
  public readonly providerId = 'r2'
  public readonly bucketName: string

  private readonly client: S3Client
  private readonly config: R2ProviderConfig

  constructor(config: R2ProviderConfig) {
    this.config = config
    this.bucketName = config.bucketName
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      // R2 works most reliably with path-style addressing
      // (https://<account>.r2.cloudflarestorage.com/<bucket>/<key>).
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Fail fast instead of hanging ~66s when the endpoint is unreachable.
      maxAttempts: config.maxAttempts,
      requestHandler: {
        connectionTimeout: config.connectionTimeoutMs,
        requestTimeout: config.requestTimeoutMs,
      },
    })
  }

  async createMultipartUpload(
    input: CreateMultipartUploadInput
  ): Promise<CreateMultipartUploadResult> {
    if (input.partCount < 1) {
      throw new Error('partCount must be >= 1')
    }

    const created = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: input.key,
        ContentType: input.contentType,
      })
    )

    if (!created.UploadId) {
      throw new Error('R2 did not return an UploadId')
    }

    const ttl = input.partUrlTtlSeconds ?? this.config.defaultPartUrlTtlSeconds
    const parts = await Promise.all(
      Array.from({ length: input.partCount }, async (_, index) => {
        const partNumber = index + 1
        const url = await getSignedUrl(
          this.client,
          new UploadPartCommand({
            Bucket: this.bucketName,
            Key: input.key,
            UploadId: created.UploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: ttl }
        )
        return { partNumber, url }
      })
    )

    return { key: input.key, uploadId: created.UploadId, parts }
  }

  async completeMultipartUpload(
    input: CompleteMultipartUploadInput
  ): Promise<{ etag?: string }> {
    const ordered = [...input.parts].sort((a, b) => a.partNumber - b.partNumber)
    const result = await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: input.key,
        UploadId: input.uploadId,
        MultipartUpload: {
          Parts: ordered.map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
          })),
        },
      })
    )
    return { etag: result.ETag }
  }

  async abortMultipartUpload(input: {
    key: string
    uploadId: string
  }): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: input.key,
        UploadId: input.uploadId,
      })
    )
  }

  async getSignedDownloadUrl(input: SignedDownloadInput): Promise<string> {
    const ttl = input.ttlSeconds ?? this.config.defaultDownloadTtlSeconds
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        ResponseContentDisposition: input.downloadFilename
          ? `attachment; filename="${input.downloadFilename}"`
          : undefined,
      }),
      { expiresIn: ttl }
    )
  }

  async headObject(key: string): Promise<HeadObjectResult | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key })
      )
      return { size: result.ContentLength, contentType: result.ContentType }
    } catch {
      return null
    }
  }

  async getObject(key: string): Promise<GetObjectResult | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucketName, Key: key })
      )
      if (!result.Body) return null
      return {
        body: result.Body as GetObjectResult['body'],
        contentType: result.ContentType,
        contentLength: result.ContentLength,
      }
    } catch {
      return null
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key })
    )
  }

  async deletePrefix(prefix: string): Promise<void> {
    let continuationToken: string | undefined
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      )

      const keys = (listed.Contents ?? [])
        .map((object) => object.Key)
        .filter((key): key is string => Boolean(key))

      if (keys.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
          })
        )
      }

      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined
    } while (continuationToken)
  }
}
