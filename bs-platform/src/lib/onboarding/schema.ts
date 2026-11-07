import { z } from 'zod'

/** Max interests / service categories selectable in onboarding (report BS-26). */
export const MAX_MULTI_SELECT = 5

const urlOptional = z
  .string()
  .trim()
  .max(500)
  .optional()
  .refine(
    (v) => !v || v === '' || /^https?:\/\/.+/i.test(v),
    'invalid_url'
  )

const accountTypeSchema = z.enum(['student', 'instructor', 'company', 'freelancer'])

const studentPrimaryGoalSchema = z.enum([
  'learn_new_skill',
  'improve_career',
  'get_job',
  'earn_certificate',
  'offer_services',
  'switch_career',
])

const interestSchema = z.enum([
  'programming',
  'design',
  'marketing',
  'business',
  'ai',
  'english',
  'office_skills',
  'freelancing',
  'professional_skills',
  'other',
])

const skillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced'])

const instructorIntentSchema = z.enum([
  'publish_courses',
  'build_audience',
  'train_students',
  'sell_training',
  'explore_platform',
])

const instructorExperienceSchema = z.enum(['none', 'beginner', 'experienced', 'professional'])
const instructorUploadPlanSchema = z.enum(['soon', 'later', 'exploring'])

const companyGoalSchema = z.enum([
  'post_jobs',
  'find_candidates',
  'hire_trainees',
  'request_services',
  'build_team',
  'training_partnerships',
])

const companySizeSchema = z.enum(['1-10', '11-50', '51-200', '200+'])

const discoverySourceSchema = z.enum([
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'youtube',
  'google',
  'friend',
  'university',
  'ad',
  'instructor',
  'company',
  'other',
])

const studentDetailsSchema = z.object({
  primary_goal: studentPrimaryGoalSchema,
  skill_level: skillLevelSchema,
  interests: z.array(interestSchema).min(1).max(MAX_MULTI_SELECT),
})

const instructorDetailsSchema = z.object({
  instructor_intent: instructorIntentSchema,
  interests: z.array(interestSchema).min(1).max(MAX_MULTI_SELECT),
  instructor_experience: instructorExperienceSchema,
  instructor_upload_plan: instructorUploadPlanSchema,
  linkedin: urlOptional,
  portfolio: urlOptional,
  youtube: urlOptional,
  website: urlOptional,
})

const companyDetailsSchema = z.object({
  company_intent: companyGoalSchema,
  company_name: z.string().trim().min(2).max(120),
  company_industry: z.string().trim().min(2).max(120),
  company_size: companySizeSchema,
  company_website: urlOptional,
  company_linkedin: urlOptional,
})

const freelancerIntentSchema = z.enum([
  'offer_services',
  'grow_clients',
  'build_portfolio',
  'part_time_income',
  'full_time_freelance',
  'explore_platform',
])

const freelancerAvailabilitySchema = z.enum(['full_time', 'part_time', 'weekends', 'flexible'])

const freelancerDetailsSchema = z.object({
  freelancer_intent: freelancerIntentSchema,
  service_categories: z.array(interestSchema).min(1).max(MAX_MULTI_SELECT),
  skill_level: skillLevelSchema,
  availability: freelancerAvailabilitySchema,
  professional_headline: z.string().trim().min(2).max(120),
  linkedin: urlOptional,
  portfolio: urlOptional,
  github: urlOptional,
  website: urlOptional,
})

const discoveryStepSchema = z
  .object({
    discovery_source: discoverySourceSchema,
    discovery_source_other: z.string().trim().max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discovery_source === 'other') {
      if (!data.discovery_source_other || data.discovery_source_other.length < 2) {
        ctx.addIssue({
          code: 'custom',
          message: 'discovery_other_required',
          path: ['discovery_source_other'],
        })
      }
    }
  })

export const completeOnboardingSchema = z
  .object({
    account_type: accountTypeSchema,
    discovery_source: discoverySourceSchema,
    discovery_source_other: z.string().trim().max(120).optional(),
    student: studentDetailsSchema.optional(),
    instructor: instructorDetailsSchema.optional(),
    company: companyDetailsSchema.optional(),
    freelancer: freelancerDetailsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discovery_source === 'other') {
      if (!data.discovery_source_other || data.discovery_source_other.length < 2) {
        ctx.addIssue({
          code: 'custom',
          message: 'discovery_other_required',
          path: ['discovery_source_other'],
        })
      }
    }
    if (data.account_type === 'student' && !data.student) {
      ctx.addIssue({ code: 'custom', message: 'student_required', path: ['student'] })
    }
    if (data.account_type === 'instructor' && !data.instructor) {
      ctx.addIssue({ code: 'custom', message: 'instructor_required', path: ['instructor'] })
    }
    if (data.account_type === 'company' && !data.company) {
      ctx.addIssue({ code: 'custom', message: 'company_required', path: ['company'] })
    }
    if (data.account_type === 'freelancer' && !data.freelancer) {
      ctx.addIssue({ code: 'custom', message: 'freelancer_required', path: ['freelancer'] })
    }
  })

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>

export {
  accountTypeSchema,
  studentDetailsSchema,
  instructorDetailsSchema,
  companyDetailsSchema,
  freelancerDetailsSchema,
  discoveryStepSchema,
  discoverySourceSchema,
  interestSchema,
  skillLevelSchema,
}
