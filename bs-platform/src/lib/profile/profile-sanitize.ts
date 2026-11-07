import type { ProfileFormState } from '@/types/profile'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function ensureUuid(id: string): string {
  return UUID_RE.test(id) ? id : crypto.randomUUID()
}

function normalizeYearMonth(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01`
  const match = trimmed.match(/^(\d{4})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : null
}

function normalizePhone(phone?: string): string {
  if (!phone?.trim()) return ''
  const digits = phone.replace(/\D/g, '')
  return digits.slice(0, 15)
}

function clampYear(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(2100, Math.max(1950, Math.round(value)))
}

function normalizeHttpsUrl(url?: string): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('https://')) return trimmed
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice(7)}`
  return undefined
}

function normalizeLinks(links: ProfileFormState['links']): ProfileFormState['links'] {
  const linkedin = normalizeHttpsUrl(links.linkedin)
  const github = normalizeHttpsUrl(links.github)
  const website = normalizeHttpsUrl(links.website)
  const twitter = normalizeHttpsUrl(links.twitter)

  return {
    ...(linkedin?.includes('linkedin.com') ? { linkedin } : {}),
    ...(github?.includes('github.com') ? { github } : {}),
    ...(website ? { website } : {}),
    ...(twitter ? { twitter } : {}),
  }
}

/** Coerce client form state into values that pass profile save validation. */
export function sanitizeProfileForSave(form: ProfileFormState): ProfileFormState {
  return {
    ...form,
    full_name: form.full_name.trim(),
    full_name_ar: form.full_name_ar?.trim() ?? '',
    avatar_url: form.avatar_url?.trim() ?? '',
    headline: form.headline?.trim() ?? '',
    phone: normalizePhone(form.phone),
    location: form.location?.trim() ?? '',
    preferred_role: form.preferred_role?.trim() ?? '',
    bio: form.bio?.trim() ?? '',
    skills: (form.skills ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30),
    experience: (form.experience ?? [])
      .filter((item) => item.company?.trim() && item.title?.trim())
      .map((item) => {
        const start = normalizeYearMonth(item.start_date) ?? '2020-01'
        const isCurrent = item.is_current
        const end = isCurrent ? null : normalizeYearMonth(item.end_date) ?? start
        return {
          ...item,
          id: ensureUuid(item.id),
          company: item.company.trim(),
          title: item.title.trim(),
          start_date: start,
          end_date: end,
          is_current: isCurrent,
          location: item.location?.trim() ?? '',
          description: (item.description?.trim() ?? '').slice(0, 500),
        }
      }),
    education: (form.education ?? [])
      .filter((item) => item.institution?.trim() && item.degree?.trim())
      .map((item) => ({
        ...item,
        id: ensureUuid(item.id),
        institution: item.institution.trim(),
        degree: item.degree.trim(),
        field: item.field?.trim() || 'General',
        start_year: clampYear(item.start_year, 2020),
        end_year: item.is_current ? null : clampYear(item.end_year, clampYear(item.start_year, 2020)),
        gpa: item.gpa?.trim() || undefined,
      })),
    projects: (form.projects ?? [])
      .filter((item) => item.name?.trim())
      .map((item) => {
        const description = (item.description?.trim() || item.name.trim()).slice(0, 500)
        return {
          ...item,
          id: ensureUuid(item.id),
          name: item.name.trim(),
          description,
          technologies: (item.technologies ?? [])
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 20),
          url: normalizeHttpsUrl(item.url),
          github_url: normalizeHttpsUrl(item.github_url),
        }
      }),
    links: normalizeLinks(form.links ?? {}),
  }
}
