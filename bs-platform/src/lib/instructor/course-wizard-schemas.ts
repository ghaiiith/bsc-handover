import { z } from 'zod'
import { iqdPriceSchema } from '@/lib/money-schema'

export const step1Schema = z.object({
  title: z.string().min(10),
  title_ar: z.string().min(10),
  description: z.string().min(50),
  description_ar: z.string().min(50),
  category: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.enum(['ar', 'en', 'both']),
})

export type Step1FormValues = z.infer<typeof step1Schema>

export const step4Schema = z.object({
  price: iqdPriceSchema(0),
})

export type Step4FormValues = z.infer<typeof step4Schema>

export const sectionSchema = z.object({
  title: z.string().min(2),
  title_ar: z.string().min(2),
})

export const lessonSchema = z.object({
  title: z.string().trim().min(2),
  title_ar: z.string().trim().min(2),
  duration_minutes: z.coerce
    .number()
    .transform((value) => {
      const minutes = Number.isFinite(value) ? Math.round(value) : 1
      return Math.max(1, minutes)
    }),
  is_free_preview: z.boolean(),
  video_asset_id: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    z.string().uuid().nullable().optional()
  ),
})

export type SectionFormValues = z.infer<typeof sectionSchema>
export type LessonFormValues = z.infer<typeof lessonSchema>
