import { z } from 'zod'
import { iqdPriceSchema } from '@/lib/money-schema'

// Report BS-22: a generic portfolio entry (title + description + links + images).
export const portfolioItemSchema = z.object({
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  links: z.array(z.string().url()).max(10).optional(),
  images: z.array(z.string().url()).max(10).optional(),
})

export type PortfolioItem = z.infer<typeof portfolioItemSchema>

export const serviceFormSchema = z.object({
  title: z.string().min(10).max(100),
  title_ar: z.string().min(10).max(100),
  description: z.string().min(100).max(2000),
  description_ar: z.string().min(100).max(2000),
  category: z.string().min(1),
  delivery_days: z.number().min(1).max(90),
  price: iqdPriceSchema(1000),
  portfolio_images: z.array(z.string().url()).max(5),
  portfolio_items: z.array(portfolioItemSchema).max(10).optional(),
})

export type ServiceFormValues = z.infer<typeof serviceFormSchema>
