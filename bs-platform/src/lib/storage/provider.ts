import 'server-only'

import { R2StorageProvider, type R2ProviderConfig } from '@/lib/storage/r2-provider'
import type { StorageProvider } from '@/lib/storage/provider-types'

/** Default signed playback TTL: long enough for a full viewing session + seeking. */
const DEFAULT_DOWNLOAD_TTL_SECONDS = 60 * 60 * 6 // 6 hours
/** Default TTL for presigned upload part URLs. */
const DEFAULT_PART_URL_TTL_SECONDS = 60 * 60 // 1 hour

const REQUIRED_ENV_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
] as const

export function getMissingStorageEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name])
}

export function isStorageConfigured(): boolean {
  return getMissingStorageEnvVars().length === 0
}

function readR2Config(): R2ProviderConfig {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      `Storage is not configured. Missing: ${getMissingStorageEnvVars().join(', ')}`
    )
  }

  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`

  const downloadTtl = Number(process.env.R2_SIGNED_URL_TTL_SECONDS)
  const partTtl = Number(process.env.R2_UPLOAD_URL_TTL_SECONDS)

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim() || undefined,
    defaultDownloadTtlSeconds:
      Number.isFinite(downloadTtl) && downloadTtl > 0
        ? downloadTtl
        : DEFAULT_DOWNLOAD_TTL_SECONDS,
    defaultPartUrlTtlSeconds:
      Number.isFinite(partTtl) && partTtl > 0
        ? partTtl
        : DEFAULT_PART_URL_TTL_SECONDS,
    maxAttempts: 2,
    // Fail fast on an unreachable endpoint (control-plane calls are small).
    connectionTimeoutMs: 8000,
    requestTimeoutMs: 30000,
  }
}

let cachedProvider: StorageProvider | null = null

/**
 * Dependency-injection seam: returns the configured storage provider.
 * Swap the concrete class here to change providers platform-wide.
 */
export function getStorageProvider(): StorageProvider {
  if (!cachedProvider) {
    cachedProvider = new R2StorageProvider(readR2Config())
  }
  return cachedProvider
}

/** Test/utility hook to override the provider (e.g. a mock). */
export function setStorageProvider(provider: StorageProvider | null): void {
  cachedProvider = provider
}
