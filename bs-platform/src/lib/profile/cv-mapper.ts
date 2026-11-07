import type {
  CvExtractedProfile,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ProfileLinks,
} from '@/types/profile'

/** Minimal ResumeInput shape from CV Builder API */
export interface ResumeBasics {
  name?: string
  email?: string
  phone?: string
  label?: string
  summary?: string
  location?: { city?: string; region?: string; countryCode?: string }
  profiles?: Array<{ network?: string; url?: string }>
}

export interface ResumeWork {
  id?: string
  name?: string
  position?: string
  startDate?: string
  endDate?: string
  location?: string
  summary?: string
  highlights?: string[]
}

export interface ResumeEducation {
  id?: string
  institution?: string
  studyType?: string
  area?: string
  startDate?: string
  endDate?: string
  score?: string
}

export interface ResumeProject {
  id?: string
  name?: string
  description?: string
  highlights?: string[]
  keywords?: string[]
  url?: string
}

export interface ResumeInput {
  basics?: ResumeBasics
  work?: ResumeWork[]
  education?: ResumeEducation[]
  projects?: ResumeProject[]
  skills?: Array<{ name?: string; keywords?: string[] }>
}

function normalizeYearMonth(value?: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01`
  const match = trimmed.match(/^(\d{4})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : null
}

function mapWorkItem(work: ResumeWork): ExperienceItem {
  const start = normalizeYearMonth(work.startDate) ?? '2020-01'
  const isCurrent = !work.endDate
  return {
    id: crypto.randomUUID(),
    company: work.name?.trim() || 'Unknown',
    title: work.position?.trim() || 'Role',
    start_date: start,
    end_date: isCurrent ? null : normalizeYearMonth(work.endDate),
    is_current: isCurrent,
    location: work.location?.trim() || '',
    description: [work.summary, ...(work.highlights ?? [])].filter(Boolean).join('\n').slice(0, 500),
  }
}

function mapEducationItem(edu: ResumeEducation): EducationItem {
  const startYear = parseInt(edu.startDate?.slice(0, 4) ?? '2020', 10)
  const endYear = edu.endDate ? parseInt(edu.endDate.slice(0, 4), 10) : null
  const isCurrent = !edu.endDate
  return {
    id: crypto.randomUUID(),
    institution: edu.institution?.trim() || 'Institution',
    degree: edu.studyType?.trim() || 'Degree',
    field: edu.area?.trim() || 'General',
    start_year: Number.isFinite(startYear) ? startYear : 2020,
    end_year: endYear && Number.isFinite(endYear) ? endYear : null,
    is_current: isCurrent,
    gpa: edu.score?.trim(),
  }
}

function mapProjectItem(project: ResumeProject): ProjectItem {
  return {
    id: crypto.randomUUID(),
    name: project.name?.trim() || 'Project',
    description: (project.description ?? project.highlights?.join('\n') ?? project.name ?? 'Project').slice(0, 500),
    technologies: project.keywords ?? [],
    url: project.url?.startsWith('https://') ? project.url : undefined,
  }
}

function mapProfiles(profiles?: ResumeBasics['profiles']): ProfileLinks {
  const links: ProfileLinks = {}
  for (const profile of profiles ?? []) {
    const url = profile.url?.trim()
    if (!url?.startsWith('https://')) continue
    const network = profile.network?.toLowerCase() ?? ''
    if (network.includes('linkedin')) links.linkedin = url
    else if (network.includes('github')) links.github = url
    else if (network.includes('twitter') || network.includes('x')) links.twitter = url
    else links.website = url
  }
  return links
}

function extractSkills(resume: ResumeInput): string[] {
  const skills: string[] = []
  for (const group of resume.skills ?? []) {
    if (group.name?.trim()) skills.push(group.name.trim())
    for (const kw of group.keywords ?? []) {
      if (kw.trim()) skills.push(kw.trim())
    }
  }
  return [...new Set(skills.map((s) => s.trim()).filter(Boolean))].slice(0, 30)
}

export function mapResumeToProfile(resume: ResumeInput): CvExtractedProfile {
  const basics = resume.basics
  const locationParts = [
    basics?.location?.city,
    basics?.location?.region,
    basics?.location?.countryCode,
  ].filter(Boolean)

  return {
    full_name: basics?.name?.trim(),
    email: basics?.email?.trim(),
    phone: basics?.phone?.trim(),
    headline: basics?.label?.trim(),
    location: locationParts.join(', '),
    bio: basics?.summary?.trim(),
    skills: extractSkills(resume),
    experience: (resume.work ?? []).map(mapWorkItem),
    education: (resume.education ?? []).map(mapEducationItem),
    projects: (resume.projects ?? []).map(mapProjectItem),
    links: mapProfiles(basics?.profiles),
  }
}
