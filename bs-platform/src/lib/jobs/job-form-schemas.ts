import { z } from 'zod'
import type { JobType } from '@/types'

const optionalSalary = z.number().min(0).nullable().optional()

const optionalEmail = z
  .string()
  .email()
  .optional()
  .or(z.literal(''))

const optionalUrl = z
  .string()
  .url()
  .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
    message: 'invalid_url',
  })
  .optional()
  .or(z.literal(''))

const optionalPhone = z.string().optional().or(z.literal(''))

const optionalWhatsapp = z
  .string()
  .regex(/^\+?[0-9]{8,15}$/, 'whatsapp_invalid')
  .optional()
  .or(z.literal(''))

export const jobFormSchema = z
  .object({
    title: z.string().min(5),
    title_ar: z.string().min(5),
    company_name: z.string().min(1),
    city: z.string().min(1),
    job_type: z.enum(['full_time', 'part_time', 'remote', 'hybrid', 'internship']),
    salary_min: optionalSalary,
    salary_max: optionalSalary,
    deadline: z.string().optional().nullable(),
    skills: z.array(z.string().min(1)).max(15),
    description: z.string().min(30, 'description_too_short'),
    description_ar: z.string().min(30, 'description_too_short'),
    contact_email: optionalEmail,
    contact_phone: optionalPhone,
    contact_link: optionalUrl,
    whatsapp_number: optionalWhatsapp,
    publish: z.boolean(),
    // Round 9 (BS-111): only honoured when the plan includes featured_jobs.
    featured: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.salary_min != null && data.salary_max != null) {
        return data.salary_max >= data.salary_min
      }
      return true
    },
    { path: ['salary_max'], message: 'salary_range_invalid' }
  )
  .refine(
    (data) => {
      const hasContact =
        Boolean(data.contact_email?.trim()) ||
        Boolean(data.contact_phone?.trim()) ||
        Boolean(data.contact_link?.trim()) ||
        Boolean(data.whatsapp_number?.trim())
      return hasContact
    },
    { path: ['contact_email'], message: 'contact_required' }
  )

export type JobFormValues = z.infer<typeof jobFormSchema>

export const COMMON_SKILLS = [
  'JavaScript',
  'Python',
  'React',
  'Node.js',
  'Design',
  'Marketing',
  'SQL',
  'Excel',
  'Communication',
  'Project Management',
]

export const JOB_TYPES: JobType[] = [
  'full_time',
  'part_time',
  'remote',
  'hybrid',
  'internship',
]
