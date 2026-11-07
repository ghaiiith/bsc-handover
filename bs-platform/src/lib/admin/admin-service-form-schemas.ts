import { z } from 'zod'
import { iqdPriceSchema } from '@/lib/money-schema'

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
  .optional()
  .or(z.literal(''))
  .refine((value) => {
    if (!value?.trim()) return true
    const digits = value.replace(/\D/g, '')
    return digits.length >= 8 && digits.length <= 15
  }, 'whatsapp_invalid')

export const adminServiceFormSchema = z
  .object({
    title: z.string().min(5, 'title_too_short').max(100),
    title_ar: z.string().min(5, 'title_too_short').max(100),
    description: z.string().min(20, 'description_too_short').max(2000),
    description_ar: z.string().min(20, 'description_too_short').max(2000),
    category: z.string().min(1),
    delivery_days: z.number().min(1).max(90),
    price: iqdPriceSchema(1000),
    portfolio_images: z.array(z.string().min(1)).max(5),
    contact_email: optionalEmail,
    contact_phone: optionalPhone,
    contact_link: optionalUrl,
    whatsapp_number: optionalWhatsapp,
    publish: z.boolean(),
  })
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

export type AdminServiceFormValues = z.infer<typeof adminServiceFormSchema>
