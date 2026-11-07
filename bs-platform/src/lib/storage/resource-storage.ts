import 'server-only'

export { isSupabaseStorageUrl, parseSupabaseStorageUrl } from '@/lib/storage/supabase-url'

export function buildResourceDownloadFilename(title: string, fileUrl: string): string {
  let extension = 'bin'
  try {
    const pathname = new URL(fileUrl).pathname
    const segment = pathname.split('/').pop()
    const ext = segment?.includes('.') ? segment.split('.').pop() : null
    if (ext) extension = ext.toLowerCase()
  } catch {
    // keep default extension
  }

  const safeTitle = title
    .trim()
    .replace(/[^\w\s\u0600-\u06FF.-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80)

  const base = safeTitle || 'resource'
  return base.toLowerCase().endsWith(`.${extension}`)
    ? base
    : `${base}.${extension}`
}
