import type { UserRole } from '@/types'
import type { PortfolioVariant } from '@/lib/portfolio/portfolio-theme'

export interface PortfolioUser {
  id: string
  full_name: string
  full_name_ar?: string | null
  avatar_url?: string | null
  headline?: string | null
  bio?: string | null
  bio_ar?: string | null
  skills: string[]
  experience: import('@/types/profile').ExperienceItem[]
  education: import('@/types/profile').EducationItem[]
  projects: PortfolioProject[]
  links: import('@/types/profile').ProfileLinks
  location?: string | null
  years_of_experience?: number | null
  availability?: boolean
  created_at: string
  portfolio_slug?: string | null
  portfolio_is_public?: boolean
  portfolio_template_id?: string | null
  role: UserRole
}

export interface PortfolioProject {
  id: string
  name: string
  description: string
  technologies: string[]
  url?: string
  github_url?: string
}

export interface PortfolioCompletedCourse {
  id: string
  title: string
  title_ar: string
  thumbnail_url: string | null
  category: string
  instructor_name: string
  instructor_name_ar?: string
}

export interface PortfolioTaughtCourse {
  id: string
  title: string
  title_ar: string
  thumbnail_url: string | null
  category: string
  enrollment_count: number
  avg_rating: number
  total_lessons: number
}

export interface PortfolioStats {
  completedCoursesCount: number
  certificatesCount: number
  skillsCount: number
  projectsCount: number
  taughtCoursesCount: number
  totalStudents: number
  avgCourseRating: number
}

export interface PortfolioViewStats {
  total: number
  thisMonth: number
}

import type { Certificate } from '@/types/certificate'

export interface PortfolioData {
  user: PortfolioUser
  variant: PortfolioVariant
  stats: PortfolioStats
  completedCourses: PortfolioCompletedCourse[]
  taughtCourses: PortfolioTaughtCourse[]
  certificates: Certificate[]
  hasDefaultCv: boolean
  viewStats: PortfolioViewStats | null
}

export interface PortfolioSettings {
  portfolio_is_public: boolean
  portfolio_slug: string | null
  viewStats: PortfolioViewStats | null
  checklist: PortfolioChecklist
}

export interface PortfolioChecklist {
  basicInfo: boolean
  skillsCount: number
  experienceCount: number
  educationCount: number
  projectsCount: number
  completedCoursesCount: number
  hasDefaultCv: boolean
}
