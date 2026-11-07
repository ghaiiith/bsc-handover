/** Account type selected during mandatory onboarding (not the RBAC role). */
export type OnboardingAccountType = 'student' | 'instructor' | 'company' | 'freelancer'

export type StudentPrimaryGoal =
  | 'learn_new_skill'
  | 'improve_career'
  | 'get_job'
  | 'earn_certificate'
  | 'offer_services'
  | 'switch_career'

export type OnboardingInterest =
  | 'programming'
  | 'design'
  | 'marketing'
  | 'business'
  | 'ai'
  | 'english'
  | 'office_skills'
  | 'freelancing'
  | 'professional_skills'
  | 'other'

export type OnboardingSkillLevel = 'beginner' | 'intermediate' | 'advanced'

export type InstructorIntent =
  | 'publish_courses'
  | 'build_audience'
  | 'train_students'
  | 'sell_training'
  | 'explore_platform'

export type InstructorExperience = 'none' | 'beginner' | 'experienced' | 'professional'

export type InstructorUploadPlan = 'soon' | 'later' | 'exploring'

export type CompanyGoal =
  | 'post_jobs'
  | 'find_candidates'
  | 'hire_trainees'
  | 'request_services'
  | 'build_team'
  | 'training_partnerships'

export type CompanySize = '1-10' | '11-50' | '51-200' | '200+'

export type FreelancerIntent =
  | 'offer_services'
  | 'grow_clients'
  | 'build_portfolio'
  | 'part_time_income'
  | 'full_time_freelance'
  | 'explore_platform'

export type FreelancerAvailability = 'full_time' | 'part_time' | 'weekends' | 'flexible'

export type DiscoverySource =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'google'
  | 'friend'
  | 'university'
  | 'ad'
  | 'instructor'
  | 'company'
  | 'other'

export interface OnboardingProfessionalLinks {
  linkedin?: string
  portfolio?: string
  youtube?: string
  website?: string
  github?: string
}

export interface OnboardingMeta {
  instructor_experience?: InstructorExperience
  instructor_upload_plan?: InstructorUploadPlan
  instructor_links?: OnboardingProfessionalLinks
  company_website?: string
  company_linkedin?: string
  freelancer_availability?: FreelancerAvailability
  freelancer_links?: OnboardingProfessionalLinks
  role_request_submitted?: boolean
  role_request_declined?: boolean
}

/** Legacy preferences stored in users.preferences jsonb (modal flow). */
export type OnboardingGoal = 'learn_skill' | 'find_job' | 'improve_skills' | 'career_change'
export type OnboardingField =
  | 'programming'
  | 'design'
  | 'data_ai'
  | 'mobile'
  | 'marketing'
  | 'video_media'
  | 'business'
  | 'other'
export type OnboardingLevel = 'beginner' | 'intermediate' | 'advanced'
export type OnboardingWeeklyHours = 'minimal' | 'light' | 'moderate' | 'intensive'

export interface OnboardingPreferences {
  goal?: OnboardingGoal
  fields?: OnboardingField[]
  level?: OnboardingLevel
  weekly_hours?: OnboardingWeeklyHours
  completed_at?: string
  skipped?: boolean
  skipped_at?: string
}

export interface UserOnboardingRow {
  account_type: OnboardingAccountType | null
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  primary_goal: StudentPrimaryGoal | null
  skill_level: OnboardingSkillLevel | null
  interests: string[]
  discovery_source: DiscoverySource | null
  discovery_source_other: string | null
  instructor_intent: InstructorIntent | null
  company_intent: CompanyGoal | null
  freelancer_intent: FreelancerIntent | null
  onboarding_company_name: string | null
  onboarding_company_industry: string | null
  onboarding_company_size: CompanySize | null
  onboarding_meta: OnboardingMeta
}
