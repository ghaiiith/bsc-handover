import type { User } from '@/types'
import type {
  CvExtractedProfile,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ProfileLinks,
} from '@/types/profile'
import type {
  CVFormData,
  CVPersonalInfo,
  CvLanguage,
  ResumeEducation,
  ResumeInput,
  ResumeProject,
  ResumeSkill,
  ResumeWork,
  SkillGroup,
} from '@/types/cv'

function emptyPersonalInfo(): CVPersonalInfo {
  return {
    name: '',
    headline: '',
    email: '',
    phone: '',
    city: '',
    linkedin: '',
    github: '',
    website: '',
  }
}

function defaultFormData(language: CvLanguage = 'ar'): CVFormData {
  return {
    personalInfo: emptyPersonalInfo(),
    summary: '',
    experience: [],
    education: [],
    skills: { groups: [{ name: '', skills: [] }] },
    projects: [],
    settings: {
      name: language === 'ar' ? 'سيرتي الذاتية' : 'My CV',
      language,
      isDefault: false,
      selectedTemplate: 'default',
    },
  }
}

function linksToProfiles(links?: ProfileLinks | null) {
  const profiles: Array<{ network: string; url: string }> = []
  if (links?.linkedin?.trim()) profiles.push({ network: 'LinkedIn', url: links.linkedin.trim() })
  if (links?.github?.trim()) profiles.push({ network: 'GitHub', url: links.github.trim() })
  if (links?.website?.trim()) profiles.push({ network: 'Website', url: links.website.trim() })
  if (links?.twitter?.trim()) profiles.push({ network: 'Twitter', url: links.twitter.trim() })
  return profiles
}

function profilesToPersonalLinks(basics?: { profiles?: Array<{ network?: string; url?: string }> }): Pick<CVPersonalInfo, 'linkedin' | 'github' | 'website'> {
  const result = { linkedin: '', github: '', website: '' }
  for (const p of basics?.profiles ?? []) {
    const url = p.url?.trim() ?? ''
    const network = (p.network ?? '').toLowerCase()
    if (network.includes('linkedin')) result.linkedin = url
    else if (network.includes('github')) result.github = url
    else if (network.includes('website') || network.includes('portfolio')) result.website = url
  }
  return result
}

function experienceToWork(items: ExperienceItem[]): ResumeWork[] {
  return items.map((item) => ({
    name: item.company,
    position: item.title,
    startDate: item.start_date,
    endDate: item.is_current ? undefined : item.end_date ?? undefined,
    location: item.location || undefined,
    summary: item.description || undefined,
    highlights: item.description.includes('\n')
      ? item.description.split('\n').filter(Boolean)
      : undefined,
  }))
}

function workToExperience(items: ResumeWork[]): ExperienceItem[] {
  return items.map((item) => {
    const isCurrent = !item.endDate
    const description =
      item.summary ??
      (item.highlights?.length ? item.highlights.join('\n') : '')
    return {
      id: crypto.randomUUID(),
      company: item.name?.trim() || '',
      title: item.position?.trim() || '',
      start_date: normalizeYearMonth(item.startDate) ?? '2020-01',
      end_date: isCurrent ? null : normalizeYearMonth(item.endDate),
      is_current: isCurrent,
      location: item.location?.trim() || '',
      description: description.slice(0, 500),
    }
  })
}

function educationToResume(items: EducationItem[]): ResumeEducation[] {
  return items.map((item) => ({
    institution: item.institution,
    studyType: item.degree,
    area: item.field,
    startDate: String(item.start_year),
    endDate: item.is_current ? undefined : item.end_year ? String(item.end_year) : undefined,
    score: item.gpa,
  }))
}

function resumeToEducation(items: ResumeEducation[]): EducationItem[] {
  return items.map((item) => {
    const startYear = parseInt(item.startDate?.slice(0, 4) ?? '2020', 10)
    const endYear = item.endDate ? parseInt(item.endDate.slice(0, 4), 10) : null
    return {
      id: crypto.randomUUID(),
      institution: item.institution?.trim() || '',
      degree: item.studyType?.trim() || '',
      field: item.area?.trim() || '',
      start_year: Number.isFinite(startYear) ? startYear : 2020,
      end_year: endYear && Number.isFinite(endYear) ? endYear : null,
      is_current: !item.endDate,
      gpa: item.score,
    }
  })
}

function projectsToResume(items: ProjectItem[]): ResumeProject[] {
  return items.map((item) => ({
    name: item.name,
    description: item.description,
    keywords: item.technologies,
    url: item.url || item.github_url,
  }))
}

function resumeToProjects(items: ResumeProject[]): ProjectItem[] {
  return items.map((item) => ({
    id: crypto.randomUUID(),
    name: item.name?.trim() || '',
    description: (item.description ?? item.highlights?.join('\n') ?? '').slice(0, 500),
    technologies: item.keywords ?? [],
    url: item.url?.startsWith('https://') ? item.url : undefined,
  }))
}

function skillsToResume(groups: SkillGroup[]): ResumeSkill[] {
  const nonEmpty = groups.filter((g) => g.skills.length > 0)
  if (nonEmpty.length === 0) return []
  if (nonEmpty.length === 1 && !nonEmpty[0].name.trim()) {
    return nonEmpty[0].skills.map((s) => ({ name: s }))
  }
  return nonEmpty.map((g) => ({
    name: g.name.trim() || undefined,
    keywords: g.skills,
  }))
}

function resumeToSkillGroups(skills: ResumeSkill[]): SkillGroup[] {
  if (!skills.length) return [{ name: '', skills: [] }]
  const groups: SkillGroup[] = skills.map((s) => {
    if (s.keywords?.length) {
      return { name: s.name?.trim() || '', skills: s.keywords }
    }
    if (s.name) return { name: '', skills: [s.name] }
    return { name: '', skills: [] }
  })
  const flat = groups.flatMap((g) => g.skills)
  if (flat.length === 0) return [{ name: '', skills: [] }]
  return groups
}

function normalizeYearMonth(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01`
  const match = trimmed.match(/^(\d{4})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : null
}

/** Map user profile (Step 1) → CV Builder API ResumeInput */
export function profileToResumeInput(user: Partial<User> & { email?: string }): ResumeInput {
  const links = user.links as ProfileLinks | undefined
  return {
    basics: {
      name: user.full_name?.trim() || user.full_name_ar?.trim() || '',
      label: user.headline?.trim() || '',
      email: user.email?.trim() || '',
      phone: user.phone?.trim() || '',
      summary: user.bio?.trim() || '',
      location: user.location?.trim() ? { city: user.location.trim() } : undefined,
      profiles: linksToProfiles(links),
    },
    work: experienceToWork((user.experience as ExperienceItem[]) ?? []),
    education: educationToResume((user.education as EducationItem[]) ?? []),
    projects: projectsToResume((user.projects as ProjectItem[]) ?? []),
    skills: ((user.skills as string[]) ?? []).map((s) => ({ name: s.trim() })).filter((s) => s.name),
  }
}

/** Map API ResumeInput → editor form state */
export function resumeInputToFormData(
  resume: ResumeInput,
  settings?: Partial<CVFormData['settings']>
): CVFormData {
  const linkFields = profilesToPersonalLinks(resume.basics)
  const language = settings?.language ?? 'ar'

  return {
    personalInfo: {
      name: resume.basics?.name?.trim() || '',
      headline: resume.basics?.label?.trim() || '',
      email: resume.basics?.email?.trim() || '',
      phone: resume.basics?.phone?.trim() || '',
      city: resume.basics?.location?.city?.trim() || '',
      linkedin: linkFields.linkedin,
      github: linkFields.github,
      website: linkFields.website,
    },
    summary: resume.basics?.summary?.trim() || '',
    experience: workToExperience(resume.work ?? []),
    education: resumeToEducation(resume.education ?? []),
    skills: { groups: resumeToSkillGroups(resume.skills ?? []) },
    projects: resumeToProjects(resume.projects ?? []),
    settings: {
      name: settings?.name ?? (language === 'ar' ? 'سيرتي الذاتية' : 'My CV'),
      language,
      isDefault: settings?.isDefault ?? false,
      selectedTemplate: settings?.selectedTemplate ?? 'default',
    },
  }
}

/** Map editor form state → API ResumeInput */
export function formDataToResumeInput(form: CVFormData): ResumeInput {
  const profiles = linksToProfiles({
    linkedin: form.personalInfo.linkedin,
    github: form.personalInfo.github,
    website: form.personalInfo.website,
  })

  return {
    basics: {
      name: form.personalInfo.name.trim(),
      label: form.personalInfo.headline.trim(),
      email: form.personalInfo.email.trim(),
      phone: form.personalInfo.phone.trim(),
      summary: form.summary.trim(),
      location: form.personalInfo.city.trim()
        ? { city: form.personalInfo.city.trim() }
        : undefined,
      profiles,
    },
    work: experienceToWork(form.experience),
    education: educationToResume(form.education),
    projects: projectsToResume(form.projects),
    skills: skillsToResume(form.skills.groups),
  }
}

export function createEmptyFormData(language: CvLanguage = 'ar'): CVFormData {
  return defaultFormData(language)
}

export function cvProfileToFormData(profile: {
  name: string
  is_default: boolean
  resume_data: ResumeInput
  selected_template: string
  language: CvLanguage
}): CVFormData {
  return resumeInputToFormData(profile.resume_data, {
    name: profile.name,
    language: profile.language,
    isDefault: profile.is_default,
    selectedTemplate: profile.selected_template,
  })
}

/** Map CV import extraction → editor form state */
export function extractedProfileToFormData(extracted: CvExtractedProfile, language: CvLanguage = 'ar'): CVFormData {
  const resume = profileToResumeInput({
    email: extracted.email,
    full_name: extracted.full_name,
    headline: extracted.headline,
    phone: extracted.phone,
    location: extracted.location,
    bio: extracted.bio,
    skills: extracted.skills,
    experience: extracted.experience,
    education: extracted.education,
    projects: extracted.projects,
    links: extracted.links,
  })
  return resumeInputToFormData(resume, { language })
}

/** Bridge CV form → profile section components */
export function cvFormToProfileSlice(form: CVFormData): {
  full_name: string
  full_name_ar: string
  avatar_url: string
  headline: string
  phone: string
  location: string
  years_of_experience: number | null
  preferred_role: string
  availability: boolean
  bio: string
  skills: string[]
  experience: ExperienceItem[]
  education: EducationItem[]
  projects: ProjectItem[]
  links: ProfileLinks
} {
  const flatSkills = form.skills.groups.flatMap((g) => g.skills).filter(Boolean)
  return {
    full_name: form.personalInfo.name,
    full_name_ar: '',
    avatar_url: '',
    headline: form.personalInfo.headline,
    phone: form.personalInfo.phone,
    location: form.personalInfo.city,
    years_of_experience: null,
    preferred_role: '',
    availability: false,
    bio: form.summary,
    skills: flatSkills,
    experience: form.experience,
    education: form.education,
    projects: form.projects,
    links: {
      linkedin: form.personalInfo.linkedin,
      github: form.personalInfo.github,
      website: form.personalInfo.website,
    },
  }
}
