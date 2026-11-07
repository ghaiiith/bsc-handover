import type { LessonWatchProgress, PlayerBookmark } from '@/types/video-player'

export function buildProgressEndpoint(playbackEndpoint: string): string {
  return playbackEndpoint.replace(/\/?$/, '/progress')
}

export function buildBookmarksEndpoint(playbackEndpoint: string): string {
  return playbackEndpoint.replace(/\/?$/, '/bookmarks')
}

export async function fetchWatchProgress(
  endpoint: string
): Promise<LessonWatchProgress | null> {
  try {
    const res = await fetch(endpoint, { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as LessonWatchProgress
  } catch {
    return null
  }
}

export async function saveWatchProgress(
  endpoint: string,
  data: {
    watchPositionSeconds: number
    completionPercent: number
    deviceInfo?: string
  }
): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchBookmarks(endpoint: string): Promise<PlayerBookmark[]> {
  try {
    const res = await fetch(endpoint, { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { bookmarks?: PlayerBookmark[] }
    return data.bookmarks ?? []
  } catch {
    return []
  }
}

export async function createBookmark(
  endpoint: string,
  timestampSeconds: number,
  title?: string
): Promise<PlayerBookmark | null> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestampSeconds, title }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { bookmark?: PlayerBookmark }
    return data.bookmark ?? null
  } catch {
    return null
  }
}

export async function deleteBookmark(
  endpoint: string,
  bookmarkId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint}?id=${encodeURIComponent(bookmarkId)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export function shouldOfferResume(
  progress: LessonWatchProgress | null,
  durationSeconds: number
): boolean {
  if (!progress || progress.completed) return false
  const pos = progress.watchPositionSeconds
  if (pos < 10) return false
  if (durationSeconds > 0 && pos / durationSeconds > 0.95) return false
  return true
}
