export function formatStudioBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatStudioDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatStudioDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale)
}

export function formatStudioProviderLabel(
  provider: string | null | undefined,
  displayName?: string | null
): string {
  if (displayName) return displayName
  if (!provider) return '—'
  return provider.toUpperCase()
}
