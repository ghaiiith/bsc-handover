import type { PlaybackProtectionCapabilities } from '@/types/content-protection'

export interface PlaybackProtectionInput {
  encrypted: boolean
  hlsUrl?: string | null
  url?: string | null
  hasSession: boolean
  supportsDrm?: boolean
}

/**
 * Derives provider-agnostic playback protection capabilities for the client.
 * Server may use provider metadata internally; the client only sees capabilities.
 */
export function resolvePlaybackProtectionCapabilities(
  input: PlaybackProtectionInput
): PlaybackProtectionCapabilities {
  const hasHls = Boolean(input.hlsUrl)
  const encryptedHls = input.encrypted && hasHls

  return {
    requiresPlaybackSession: input.hasSession || encryptedHls,
    supportsEncryptedHls: encryptedHls,
    supportsSignedPlayback: Boolean(input.url || input.hlsUrl),
    supportsCookieValidation: encryptedHls,
    supportsDrm: input.supportsDrm ?? false,
  }
}

export function sessionRequiredByCapabilities(
  capabilities?: PlaybackProtectionCapabilities | null
): boolean {
  return capabilities?.requiresPlaybackSession === true
}
