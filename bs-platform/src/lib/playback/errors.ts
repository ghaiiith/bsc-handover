import type { PlatformPlaybackErrorCode } from '@/types/video-player'

const ERROR_I18N_KEYS: Record<PlatformPlaybackErrorCode, string> = {
  network_lost: 'video_player.errors.network_lost',
  unavailable: 'video_player.errors.unavailable',
  permission_denied: 'video_player.errors.permission_denied',
  processing: 'video_player.errors.processing',
  restricted: 'video_player.errors.restricted',
  session_expired: 'video_player.errors.session_expired',
}

export function getPlatformErrorKey(code: PlatformPlaybackErrorCode): string {
  return ERROR_I18N_KEYS[code]
}

export function mapNativeError(error: unknown): PlatformPlaybackErrorCode {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'permission_denied'
    if (error.name === 'NetworkError') return 'network_lost'
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('network') || message.includes('fetch')) return 'network_lost'
    if (message.includes('403') || message.includes('forbidden')) return 'permission_denied'
    if (message.includes('401') || message.includes('expired')) return 'session_expired'
  }
  return 'unavailable'
}
