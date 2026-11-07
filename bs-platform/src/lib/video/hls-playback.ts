import 'server-only'

import { getStorageProvider } from '@/lib/storage/provider'
import { hlsMasterKey } from '@/lib/storage/object-keys'

const HLS_SEGMENT_PATTERN = /^[\w.-]+(?:\/[\w.-]+)*$/

/** Reject path traversal and non-HLS extensions. */
export function sanitizeHlsRelativePath(segments: string[]): string | null {
  if (segments.length === 0) return 'master.m3u8'

  const relativePath = segments.join('/')
  if (
    relativePath.includes('..') ||
    relativePath.startsWith('/') ||
    !HLS_SEGMENT_PATTERN.test(relativePath)
  ) {
    return null
  }

  if (!relativePath.endsWith('.m3u8') && !relativePath.endsWith('.ts')) {
    return null
  }

  return relativePath
}

export function resolveHlsContentType(relativePath: string): string {
  if (relativePath.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl'
  if (relativePath.endsWith('.ts')) return 'video/mp2t'
  return 'application/octet-stream'
}

export function buildLessonHlsProxyPath(
  courseId: string,
  lessonId: string,
  relativePath = 'master.m3u8'
): string {
  return `/api/courses/${courseId}/lessons/${lessonId}/hls/${relativePath}`
}

export function buildLessonKeyPath(courseId: string, lessonId: string): string {
  return `/api/courses/${courseId}/lessons/${lessonId}/playback/key`
}

/**
 * Rewrites #EXT-X-KEY URIs in variant playlists to the authenticated key endpoint.
 * Keys are never served from R2.
 */
export function rewriteEncryptedPlaylist(
  content: string,
  courseId: string,
  lessonId: string
): string {
  const keyUri = buildLessonKeyPath(courseId, lessonId)
  return content
    .split('\n')
    .map((line) => {
      if (!line.includes('#EXT-X-KEY')) return line
      return line.replace(/URI="[^"]*"/, `URI="${keyUri}"`)
    })
    .join('\n')
}

/** True when the studio pipeline uploaded a master playlist for this lesson slot. */
export async function isLessonHlsReady(
  courseId: string,
  lessonId: string
): Promise<boolean> {
  const head = await getStorageProvider().headObject(
    hlsMasterKey(courseId, lessonId)
  )
  return head != null
}
