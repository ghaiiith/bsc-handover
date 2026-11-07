import { isSupabaseStorageUrl } from '@/lib/storage/supabase-url'
import type { ResourceUrlAccessMode } from '@/types'

export function isExternalResourceUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  return !isSupabaseStorageUrl(trimmed)
}

export function effectiveResourceUrlAccessMode(
  fileUrl: string,
  mode: ResourceUrlAccessMode | null | undefined
): ResourceUrlAccessMode {
  if (!isExternalResourceUrl(fileUrl)) return 'download'
  return mode === 'visit' ? 'visit' : 'download'
}
