import type { ResumeInput, ResumeEducation, ResumeProject, ResumeSkill, ResumeWork } from '@/types/cv'

/** Canonical resume shape accepted by CV Builder API (`/generate`, `/analyze`, `/edit`). */
export interface CvBuilderResume {
  name?: string
  headline?: string
  preferred_role?: string
  email?: string
  phone?: string
  location?: string
  city?: string
  country?: string
  github?: string
  linkedin?: string
  portfolio?: string
  links?: {
    github?: string
    linkedin?: string
    portfolio?: string
    website?: string
  }
  summary?: string
  skills?: Array<{ label: string; items: string[] }> | Record<string, string[]> | string[]
  education?: Array<Record<string, unknown>>
  experience?: Array<Record<string, unknown>>
  projects?: Array<Record<string, unknown>>
  positions?: Array<Record<string, unknown>>
}

function formatDates(start?: string, end?: string): string {
  const startYear = start?.slice(0, 4) ?? ''
  const endYear = end?.slice(0, 4) ?? ''
  if (startYear && endYear) return `${startYear} - ${endYear}`
  if (startYear) return `${startYear} - Present`
  return endYear || ''
}

function workToExperience(items: ResumeWork[]): Array<Record<string, unknown>> {
  return items.map((item) => ({
    role: item.position ?? '',
    org: item.name ?? '',
    location: item.location ?? '',
    dates: formatDates(item.startDate, item.endDate),
    bullets: item.highlights?.length
      ? item.highlights
      : item.summary
        ? item.summary.split('\n').filter(Boolean)
        : [],
  }))
}

function educationToApi(items: ResumeEducation[]): Array<Record<string, unknown>> {
  return items.map((item) => ({
    degree: item.studyType ?? '',
    field: item.area ?? '',
    institution: item.institution ?? '',
    dates: formatDates(item.startDate, item.endDate),
    score: item.score ?? '',
  }))
}

function projectsToApi(items: ResumeProject[]): Array<Record<string, unknown>> {
  return items.map((item) => ({
    name: item.name ?? '',
    description: item.description ?? '',
    link: item.url ?? '',
    tech: item.keywords?.join(', ') ?? '',
    bullets: item.highlights ?? [],
  }))
}

function skillsToApi(skills: ResumeSkill[]): CvBuilderResume['skills'] {
  const flat: string[] = []
  const grouped: Record<string, string[]> = {}

  for (const skill of skills) {
    if (skill.keywords?.length) {
      const label = skill.name?.trim()
      if (label) {
        grouped[label] = [...(grouped[label] ?? []), ...skill.keywords.map((s) => s.trim()).filter(Boolean)]
      } else {
        flat.push(...skill.keywords.map((s) => s.trim()).filter(Boolean))
      }
    } else if (skill.name?.trim()) {
      flat.push(skill.name.trim())
    }
  }

  const groupKeys = Object.keys(grouped)
  if (groupKeys.length === 0) {
    return flat.length > 0 ? [...new Set(flat)] : undefined
  }

  if (flat.length > 0) {
    grouped.Skills = [...(grouped.Skills ?? []), ...flat]
  }

  const deduped: Record<string, string[]> = {}
  for (const [label, items] of Object.entries(grouped)) {
    deduped[label] = [...new Set(items)]
  }

  const keys = Object.keys(deduped)
  if (keys.length === 1 && keys[0] === 'Skills') {
    return deduped.Skills
  }

  return deduped
}

function linksFromBasics(basics: ResumeInput['basics']): Pick<CvBuilderResume, 'github' | 'linkedin' | 'portfolio' | 'links'> {
  const links = { github: '', linkedin: '', portfolio: '', website: '' }

  for (const profile of basics?.profiles ?? []) {
    const url = profile.url?.trim() ?? ''
    const network = (profile.network ?? '').toLowerCase()
    if (network.includes('linkedin')) links.linkedin = url
    else if (network.includes('github')) links.github = url
    else if (network.includes('website') || network.includes('portfolio')) {
      links.portfolio = url
      links.website = url
    }
  }

  return {
    github: links.github || undefined,
    linkedin: links.linkedin || undefined,
    portfolio: links.portfolio || undefined,
    links,
  }
}

/** Map Business Skills JSON Resume storage → CV Builder flat request body. */
export function resumeInputToCvBuilder(resume: ResumeInput): CvBuilderResume {
  const basics = resume.basics ?? {}
  const linkFields = linksFromBasics(basics)
  const city = basics.location?.city ?? basics.location?.region ?? ''

  return {
    name: basics.name?.trim() || undefined,
    headline: basics.label?.trim() || undefined,
    preferred_role: basics.label?.trim() || undefined,
    email: basics.email?.trim() || undefined,
    phone: basics.phone?.trim() || undefined,
    city: city || undefined,
    country: basics.location?.countryCode ?? undefined,
    location: city || undefined,
    summary: basics.summary?.trim() || undefined,
    ...linkFields,
    skills: resume.skills?.length ? skillsToApi(resume.skills) : undefined,
    education: resume.education?.length ? educationToApi(resume.education) : undefined,
    experience: resume.work?.length ? workToExperience(resume.work) : undefined,
    projects: resume.projects?.length ? projectsToApi(resume.projects) : undefined,
    positions: [],
  }
}

/** Map CV Builder `profile` / `resume` response → Business Skills JSON Resume storage. */
export function cvBuilderToResumeInput(data: CvBuilderResume): ResumeInput {
  const links = data.links ?? {}
  const profiles: Array<{ network: string; url: string }> = []

  const linkedin = data.linkedin ?? links.linkedin
  const github = data.github ?? links.github
  const portfolio = data.portfolio ?? links.portfolio ?? links.website

  if (linkedin?.trim()) profiles.push({ network: 'LinkedIn', url: linkedin.trim() })
  if (github?.trim()) profiles.push({ network: 'GitHub', url: github.trim() })
  if (portfolio?.trim()) profiles.push({ network: 'Website', url: portfolio.trim() })

  const skillsRaw = data.skills
  const skills: ResumeSkill[] = []

  if (Array.isArray(skillsRaw)) {
    for (const group of skillsRaw) {
      if (group && typeof group === 'object' && 'items' in group) {
        const label = String((group as { label?: string }).label ?? '')
        const items = (group as { items?: string[] }).items ?? []
        if (items.length) skills.push({ name: label || undefined, keywords: items })
      }
    }
  } else if (skillsRaw && typeof skillsRaw === 'object') {
    for (const [label, items] of Object.entries(skillsRaw)) {
      const list = Array.isArray(items) ? items.map(String) : [String(items)]
      skills.push({ name: label, keywords: list })
    }
  }

  return {
    basics: {
      name: data.name ?? '',
      label: data.headline ?? data.preferred_role ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      summary: data.summary ?? '',
      location: data.city || data.location
        ? { city: data.city ?? data.location ?? '' }
        : undefined,
      profiles,
    },
    work: (data.experience ?? []).map((item) => {
      const exp = item as Record<string, unknown>
      const dates = String(exp.dates ?? '')
      const [start, end] = dates.split(/\s*-\s*/)
      const bullets = Array.isArray(exp.bullets) ? exp.bullets.map(String) : []
      return {
        name: String(exp.org ?? exp.company ?? ''),
        position: String(exp.role ?? exp.title ?? ''),
        startDate: start?.trim().slice(0, 7),
        endDate: end?.toLowerCase().includes('present') ? undefined : end?.trim().slice(0, 7),
        location: String(exp.location ?? ''),
        summary: bullets.join('\n'),
        highlights: bullets,
      }
    }),
    education: (data.education ?? []).map((item) => {
      const edu = item as Record<string, unknown>
      const dates = String(edu.dates ?? '')
      const [start, end] = dates.split(/\s*-\s*/)
      return {
        institution: String(edu.institution ?? edu.university ?? ''),
        studyType: String(edu.degree ?? ''),
        area: String(edu.field ?? edu.department ?? ''),
        startDate: start?.trim(),
        endDate: end?.trim(),
        score: edu.score ? String(edu.score) : undefined,
      }
    }),
    projects: (data.projects ?? []).map((item) => {
      const proj = item as Record<string, unknown>
      const bullets = Array.isArray(proj.bullets) ? proj.bullets.map(String) : []
      return {
        name: String(proj.name ?? proj.title ?? ''),
        description: String(proj.description ?? bullets.join('\n')),
        highlights: bullets,
        keywords: String(proj.tech ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        url: proj.link ? String(proj.link) : undefined,
      }
    }),
    skills,
  }
}

/** Minimal resume stub for general AI instructions via `/edit`. */
export function buildAiStubResume(content: string): CvBuilderResume {
  return {
    name: 'User',
    headline: '',
    preferred_role: '',
    email: 'user@eduwork.local',
    phone: '',
    location: '',
    links: { github: '', linkedin: '', portfolio: '' },
    summary: content,
    skills: [],
    education: [],
    experience: [],
    projects: [],
    positions: [],
  }
}
