const SUPABASE_PUBLIC_OBJECT_PATTERN =
  /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i

export function isSupabaseStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return SUPABASE_PUBLIC_OBJECT_PATTERN.test(parsed.pathname)
  } catch {
    return false
  }
}

export function parseSupabaseStorageUrl(
  url: string
): { bucket: string; path: string } | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(SUPABASE_PUBLIC_OBJECT_PATTERN)
    if (!match) return null
    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    }
  } catch {
    return null
  }
}
