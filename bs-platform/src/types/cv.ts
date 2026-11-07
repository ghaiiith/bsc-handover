import type {
  EducationItem,
  ExperienceItem,
  ProjectItem,
} from '@/types/profile'

export type CvLanguage = 'ar' | 'en'

export interface ResumeLocation {
  city?: string
  region?: string
  countryCode?: string
}

export interface ResumeProfile {
  network?: string
  url?: string
  username?: string
}

export interface ResumeBasics {
  name?: string
  label?: string
  email?: string
  phone?: string
  summary?: string
  location?: ResumeLocation
  profiles?: ResumeProfile[]
}

export interface ResumeWork {
  name?: string
  position?: string
  startDate?: string
  endDate?: string
  location?: string
  summary?: string
  highlights?: string[]
}

export interface ResumeEducation {
  institution?: string
  studyType?: string
  area?: string
  startDate?: string
  endDate?: string
  score?: string
}

export interface ResumeProject {
  name?: string
  description?: string
  highlights?: string[]
  keywords?: string[]
  url?: string
}

export interface ResumeSkill {
  name?: string
  keywords?: string[]
  level?: string
}

export interface ResumeInput {
  basics?: ResumeBasics
  work?: ResumeWork[]
  education?: ResumeEducation[]
  projects?: ResumeProject[]
  skills?: ResumeSkill[]
}

export interface SkillGroup {
  name: string
  skills: string[]
}

export interface CVPersonalInfo {
  name: string
  headline: string
  email: string
  phone: string
  city: string
  linkedin: string
  github: string
  website: string
}

export interface CVFormSettings {
  name: string
  language: CvLanguage
  isDefault: boolean
  selectedTemplate: string
}

export interface CVFormData {
  personalInfo: CVPersonalInfo
  summary: string
  experience: ExperienceItem[]
  education: EducationItem[]
  skills: { groups: SkillGroup[] }
  projects: ProjectItem[]
  settings: CVFormSettings
}

export interface CVProfile {
  id: string
  user_id: string
  name: string
  is_default: boolean
  resume_data: ResumeInput
  selected_template: string
  language: CvLanguage
  last_generated_at: string | null
  created_at: string
  updated_at: string
}

export interface CVExport {
  id: string
  profile_id: string
  user_id: string
  pdf_storage_path: string | null
  template_used: string | null
  created_at: string
}

export interface CVTemplate {
  id: string
  name: string
  thumbnail?: string
}

export interface AtsReport {
  score: number
  missing_keywords: string[]
  suggestions: string[]
}

export interface AtsHistoryEntry {
  timestamp: string
  cvName: string
  jobTitle: string
  score: number
}
