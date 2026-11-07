function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

const GRADIENTS = [
  'from-[#F97316] to-[#22C55E]',
  'from-[#FB923C] to-[#10B981]',
  'from-[#EA580C] to-[#059669]',
  'from-[#F59E0B] to-[#34D399]',
] as const

export function getAvatarGradient(name: string): string {
  const index = hashName(name || 'user') % GRADIENTS.length
  return GRADIENTS[index]
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function displayName(
  fullName: string,
  fullNameAr?: string | null,
  locale?: string
): string {
  if (locale === 'ar' && fullNameAr?.trim()) return fullNameAr.trim()
  return fullName?.trim() || fullNameAr?.trim() || '—'
}
