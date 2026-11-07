import { z } from 'zod'

const httpsUrl = z
  .string()
  .url()
  .refine((v) => v.startsWith('https://'), { message: 'https_required' })

const optionalHttpsUrl = z.union([z.literal(''), httpsUrl]).optional()

const experienceSchema = z.object({
  id: z.string().uuid(),
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  is_current: z.boolean(),
  location: z.string().max(200),
  description: z.string().max(500),
})

const educationSchema = z.object({
  id: z.string().uuid(),
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(100),
  field: z.string().min(1).max(200),
  start_year: z.number().int().min(1950).max(2100),
  end_year: z.number().int().min(1950).max(2100).nullable(),
  is_current: z.boolean(),
  gpa: z.string().max(20).optional(),
})

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  technologies: z.array(z.string().min(1).max(50)).max(20),
  url: optionalHttpsUrl,
  github_url: optionalHttpsUrl,
})

const linksSchema = z.object({
  linkedin: z
    .union([z.literal(''), httpsUrl])
    .optional()
    .refine((v) => !v || v.includes('linkedin.com'), { message: 'invalid_linkedin' }),
  github: z
    .union([z.literal(''), httpsUrl])
    .optional()
    .refine((v) => !v || v.includes('github.com'), { message: 'invalid_github' }),
  website: optionalHttpsUrl,
  twitter: optionalHttpsUrl,
})

export const profileSaveSchema = z.object({
  full_name: z.string().min(1).max(200),
  full_name_ar: z.string().max(200).optional(),
  avatar_url: z.union([z.literal(''), z.string().url()]).optional(),
  headline: z.string().max(100).optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v?.trim()) return true
        const digits = v.replace(/\D/g, '')
        return digits.length >= 7 && digits.length <= 15
      },
      { message: 'invalid_phone' }
    ),
  location: z.string().max(100).optional(),
  years_of_experience: z.number().int().min(0).max(50).nullable().optional(),
  preferred_role: z.string().max(200).optional(),
  availability: z.boolean().optional(),
  // Report BS-61: three-state availability (the boolean is derived from it).
  availability_status: z.enum(['open_to_work', 'open_to_offers', 'not_looking']).optional(),
  accepts_messages: z.boolean().optional(),
  // Report BS-65: optional expected salary (never required).
  expected_salary_amount: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  expected_salary_currency: z.enum(['IQD', 'USD']).optional(),
  expected_salary_period: z.enum(['monthly', 'yearly']).optional(),
  expected_salary_public: z.boolean().optional(),
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string().min(1).max(50)).max(30).optional(),
  experience: z.array(experienceSchema).optional(),
  education: z.array(educationSchema).optional(),
  projects: z.array(projectSchema).optional(),
  links: linksSchema.optional(),
})

export type ProfileSaveInput = z.infer<typeof profileSaveSchema>

export const improveBioSchema = z.object({
  bio: z.string().min(30).max(1000),
  headline: z.string().max(100).optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(experienceSchema).optional(),
})

export const suggestSkillsSchema = z.object({
  experience: z.array(experienceSchema).min(1),
  current_skills: z.array(z.string()),
})
