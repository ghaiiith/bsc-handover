import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Building2,
  GraduationCap,
  Briefcase,
  Award,
  Wrench,
  RefreshCw,
  Code,
  Palette,
  Megaphone,
  Brain,
  Languages,
  Laptop,
  Handshake,
  MoreHorizontal,
  Sprout,
  TreeDeciduous,
  Trees,
  Upload,
  Clock,
  Search,
  Store,
} from 'lucide-react'
import type {
  CompanyGoal,
  CompanySize,
  DiscoverySource,
  FreelancerAvailability,
  FreelancerIntent,
  InstructorExperience,
  InstructorIntent,
  InstructorUploadPlan,
  OnboardingAccountType,
  OnboardingInterest,
  OnboardingSkillLevel,
  StudentPrimaryGoal,
} from '@/types/onboarding'

export interface SelectOption<T extends string = string> {
  value: T
  labelKey: string
  descKey?: string
  icon?: LucideIcon
}

export const ACCOUNT_TYPE_OPTIONS: SelectOption<OnboardingAccountType>[] = [
  { value: 'student', labelKey: 'account_student', descKey: 'account_student_desc', icon: GraduationCap },
  { value: 'instructor', labelKey: 'account_instructor', descKey: 'account_instructor_desc', icon: BookOpen },
  { value: 'freelancer', labelKey: 'account_freelancer', descKey: 'account_freelancer_desc', icon: Store },
  { value: 'company', labelKey: 'account_company', descKey: 'account_company_desc', icon: Building2 },
]

export const STUDENT_GOAL_OPTIONS: SelectOption<StudentPrimaryGoal>[] = [
  { value: 'learn_new_skill', labelKey: 'goal_learn_new_skill', icon: BookOpen },
  { value: 'improve_career', labelKey: 'goal_improve_career', icon: RefreshCw },
  { value: 'get_job', labelKey: 'goal_get_job', icon: Briefcase },
  { value: 'earn_certificate', labelKey: 'goal_earn_certificate', icon: Award },
  { value: 'offer_services', labelKey: 'goal_offer_services', icon: Wrench },
  { value: 'switch_career', labelKey: 'goal_switch_career', icon: RefreshCw },
]

export const INTEREST_OPTIONS: SelectOption<OnboardingInterest>[] = [
  { value: 'programming', labelKey: 'interest_programming', icon: Code },
  { value: 'design', labelKey: 'interest_design', icon: Palette },
  { value: 'marketing', labelKey: 'interest_marketing', icon: Megaphone },
  { value: 'business', labelKey: 'interest_business', icon: Briefcase },
  { value: 'ai', labelKey: 'interest_ai', icon: Brain },
  { value: 'english', labelKey: 'interest_english', icon: Languages },
  { value: 'office_skills', labelKey: 'interest_office_skills', icon: Laptop },
  { value: 'freelancing', labelKey: 'interest_freelancing', icon: Handshake },
  { value: 'professional_skills', labelKey: 'interest_professional_skills', icon: Award },
  { value: 'other', labelKey: 'interest_other', icon: MoreHorizontal },
]

export const SKILL_LEVEL_OPTIONS: SelectOption<OnboardingSkillLevel>[] = [
  { value: 'beginner', labelKey: 'level_beginner', descKey: 'level_beginner_desc', icon: Sprout },
  { value: 'intermediate', labelKey: 'level_intermediate', descKey: 'level_intermediate_desc', icon: TreeDeciduous },
  { value: 'advanced', labelKey: 'level_advanced', descKey: 'level_advanced_desc', icon: Trees },
]

export const INSTRUCTOR_INTENT_OPTIONS: SelectOption<InstructorIntent>[] = [
  { value: 'publish_courses', labelKey: 'instructor_publish_courses', icon: Upload },
  { value: 'build_audience', labelKey: 'instructor_build_audience', icon: Megaphone },
  { value: 'train_students', labelKey: 'instructor_train_students', icon: GraduationCap },
  { value: 'sell_training', labelKey: 'instructor_sell_training', icon: Briefcase },
  { value: 'explore_platform', labelKey: 'instructor_explore_platform', icon: Search },
]

export const INSTRUCTOR_EXPERIENCE_OPTIONS: SelectOption<InstructorExperience>[] = [
  { value: 'none', labelKey: 'experience_none', icon: Sprout },
  { value: 'beginner', labelKey: 'experience_beginner', icon: TreeDeciduous },
  { value: 'experienced', labelKey: 'experience_experienced', icon: Trees },
  { value: 'professional', labelKey: 'experience_professional', icon: Award },
]

export const INSTRUCTOR_UPLOAD_PLAN_OPTIONS: SelectOption<InstructorUploadPlan>[] = [
  { value: 'soon', labelKey: 'upload_soon', icon: Upload },
  { value: 'later', labelKey: 'upload_later', icon: Clock },
  { value: 'exploring', labelKey: 'upload_exploring', icon: Search },
]

export const COMPANY_GOAL_OPTIONS: SelectOption<CompanyGoal>[] = [
  { value: 'post_jobs', labelKey: 'company_post_jobs', icon: Briefcase },
  { value: 'find_candidates', labelKey: 'company_find_candidates', icon: Search },
  { value: 'hire_trainees', labelKey: 'company_hire_trainees', icon: GraduationCap },
  { value: 'request_services', labelKey: 'company_request_services', icon: Wrench },
  { value: 'build_team', labelKey: 'company_build_team', icon: Building2 },
  { value: 'training_partnerships', labelKey: 'company_training_partnerships', icon: Handshake },
]

export const COMPANY_SIZE_OPTIONS: SelectOption<CompanySize>[] = [
  { value: '1-10', labelKey: 'size_1_10' },
  { value: '11-50', labelKey: 'size_11_50' },
  { value: '51-200', labelKey: 'size_51_200' },
  { value: '200+', labelKey: 'size_200_plus' },
]

export const FREELANCER_INTENT_OPTIONS: SelectOption<FreelancerIntent>[] = [
  { value: 'offer_services', labelKey: 'freelancer_offer_services', icon: Wrench },
  { value: 'grow_clients', labelKey: 'freelancer_grow_clients', icon: Megaphone },
  { value: 'build_portfolio', labelKey: 'freelancer_build_portfolio', icon: Palette },
  { value: 'part_time_income', labelKey: 'freelancer_part_time', icon: Clock },
  { value: 'full_time_freelance', labelKey: 'freelancer_full_time', icon: Briefcase },
  { value: 'explore_platform', labelKey: 'freelancer_explore', icon: Search },
]

export const FREELANCER_AVAILABILITY_OPTIONS: SelectOption<FreelancerAvailability>[] = [
  { value: 'full_time', labelKey: 'freelancer_avail_full_time' },
  { value: 'part_time', labelKey: 'freelancer_avail_part_time' },
  { value: 'weekends', labelKey: 'freelancer_avail_weekends' },
  { value: 'flexible', labelKey: 'freelancer_avail_flexible' },
]

export const DISCOVERY_SOURCE_OPTIONS: SelectOption<DiscoverySource>[] = [
  { value: 'instagram', labelKey: 'discovery_instagram' },
  { value: 'facebook', labelKey: 'discovery_facebook' },
  { value: 'tiktok', labelKey: 'discovery_tiktok' },
  { value: 'linkedin', labelKey: 'discovery_linkedin' },
  { value: 'youtube', labelKey: 'discovery_youtube' },
  { value: 'google', labelKey: 'discovery_google' },
  { value: 'friend', labelKey: 'discovery_friend' },
  { value: 'university', labelKey: 'discovery_university' },
  { value: 'ad', labelKey: 'discovery_ad' },
  { value: 'instructor', labelKey: 'discovery_instructor' },
  { value: 'company', labelKey: 'discovery_company' },
  { value: 'other', labelKey: 'discovery_other' },
]

export const ONBOARDING_TOTAL_STEPS = 4
