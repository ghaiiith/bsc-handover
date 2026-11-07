import type { SecurePlaybackResponse } from '@/types/content-protection'
import type {
  PlatformPlaybackErrorCode,
  ResolvedPlaybackConfig,
} from '@/types/video-player'
import { sessionRequiredByCapabilities } from '@/lib/video/playback-protection-capabilities'

const EMBED_CHROME_PARAMS =
  'title=0&byline=0&portrait=0&badge=0&controls=0&pip=0&dnt=1'

function sanitizeEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url)
    for (const [key, value] of new URLSearchParams(EMBED_CHROME_PARAMS)) {
      parsed.searchParams.set(key, value)
    }
    return parsed.toString()
  } catch {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${EMBED_CHROME_PARAMS}`
  }
}

function mapStatusToError(
  status: SecurePlaybackResponse['status']
): PlatformPlaybackErrorCode {
  switch (status) {
    case 'pending':
    case 'uploading':
      return 'processing'
    case 'failed':
      return 'unavailable'
    default:
      return 'unavailable'
  }
}

export function mapHttpStatusToError(status: number): PlatformPlaybackErrorCode {
  if (status === 401 || status === 403) return 'permission_denied'
  if (status === 410) return 'session_expired'
  return 'unavailable'
}

export function mapFetchErrorToPlatformError(
  status: SecurePlaybackResponse['status'] | undefined,
  httpStatus?: number
): PlatformPlaybackErrorCode {
  if (httpStatus) return mapHttpStatusToError(httpStatus)
  if (status) return mapStatusToError(status)
  return 'unavailable'
}

/**
 * Converts a secure playback API response into a provider-agnostic engine config.
 * Provider identifiers are stripped — only the admin debug channel may retain them.
 */
export function resolvePlaybackConfig(
  data: SecurePlaybackResponse,
  options?: {
    poster?: string | null
    sessionEndpoint?: string
    isAdmin?: boolean
  }
): ResolvedPlaybackConfig | { error: PlatformPlaybackErrorCode } {
  if (data.status !== 'ready') {
    return { error: mapStatusToError(data.status) }
  }

  const adminDebug =
    options?.isAdmin && data.provider
      ? {
          providerId: data.provider,
          sessionId: data.session?.sessionId,
          playbackMode: data.playbackMode,
        }
      : undefined

  const needsSession = sessionRequiredByCapabilities(data.playbackProtection)

  const sessionEndpoint = needsSession ? options?.sessionEndpoint : undefined
  const session = data.session
    ? {
        sessionId: data.session.sessionId,
        expiresAt: data.session.expiresAt,
        renewBefore: data.session.renewBefore,
      }
    : undefined

  if (data.hlsUrl) {
    return {
      engine: 'hls',
      hlsUrl: data.hlsUrl,
      mp4FallbackUrl: data.url,
      poster: options?.poster,
      sessionEndpoint,
      session,
      watermark: data.watermark,
      watermarkContext: data.watermarkContext,
      metadata: data.metadata,
      adminDebug,
    }
  }

  if (data.url) {
    return {
      engine: 'html5',
      streamUrl: data.url,
      poster: options?.poster,
      sessionEndpoint,
      session,
      watermark: data.watermark,
      watermarkContext: data.watermarkContext,
      metadata: data.metadata,
      adminDebug,
    }
  }

  if (data.embedUrl) {
    return {
      engine: 'embed',
      embedUrl: sanitizeEmbedUrl(data.embedUrl),
      poster: options?.poster,
      sessionEndpoint,
      session,
      watermark: data.watermark,
      watermarkContext: data.watermarkContext,
      metadata: data.metadata,
      adminDebug,
    }
  }

  return { error: 'unavailable' }
}

export function buildSessionEndpoint(playbackEndpoint: string): string {
  return playbackEndpoint.replace(/\/?$/, '/session')
}
