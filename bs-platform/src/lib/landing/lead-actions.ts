'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { fanOutLead } from '@/lib/landing/lead-notify'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'
import { notifyAllAdmins } from '@/lib/admin/notify-admins'

const leadSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  job_title: z.string().trim().max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .refine((v) => v.replace(/\D/g, '').length >= 7, { message: 'invalid_phone' }),
  email: z.string().trim().email().max(160),
  company_size: z.enum(['1-5', '6-20', '20+']).optional(),
  locale: z.enum(['ar', 'en']).optional().default('ar'),
})

export type LeadInput = z.infer<typeof leadSchema>

/**
 * Capture a growth-guide lead and hand back the download URL. Anonymous by
 * design (that is the point of a lead magnet) so it is rate-limited per IP, and
 * a repeat submission from the same email refreshes the existing row rather than
 * erroring at the unique index.
 */
export async function submitGrowthGuideLead(
  input: LeadInput
): Promise<{ success?: boolean; pdfUrl?: string; bookingUrl?: string; error?: string }> {
  const parsed = leadSchema.safeParse(input)
  if (!parsed.success) return { error: 'validation_failed' }

  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown'
  const rate = await checkDurableRateLimit({
    key: `landing:lead:ip:${ip}`,
    max: 5,
    windowSeconds: 600,
  })
  if (!rate.allowed) return { error: 'rate_limited' }

  const data = parsed.data
  const admin = createAdminClient()

  // Persist explicitly: the unique index is on lower(email) + source, which
  // PostgREST's onConflict cannot target, so a blind upsert fails and a blind
  // update can match ZERO rows while reporting no error — that would tell the
  // visitor "done" and quietly lose the lead. Look it up, then insert or update,
  // and verify a row actually came back.
  const email = data.email.toLowerCase()
  const now = new Date().toISOString()
  const fields = {
    full_name: data.full_name,
    job_title: data.job_title || null,
    whatsapp: data.whatsapp,
    company_size: data.company_size ?? null,
    locale: data.locale,
    downloaded_at: now,
  }

  const { data: existing } = await admin
    .from('landing_leads')
    .select('id')
    .eq('email', email)
    .eq('source', 'growth_guide')
    .maybeSingle()

  const saved = existing?.id
    ? await admin
        .from('landing_leads')
        .update(fields)
        .eq('id', existing.id)
        .select('id')
        .maybeSingle()
    : await admin
        .from('landing_leads')
        .insert({ ...fields, email, source: 'growth_guide' })
        .select('id')
        .maybeSingle()

  if (saved.error || !saved.data) {
    console.error('[landing/lead] save failed:', saved.error?.message ?? 'no row returned')
    return { error: 'save_failed' }
  }

  const { data: settings } = await admin
    .from('platform_settings')
    .select('key, value')
    .in('key', ['growth_guide_pdf_url', 'growth_guide_booking_url'])
  const map = new Map((settings ?? []).map((r) => [r.key as string, (r.value as string) ?? '']))

  // Marketing item 1: instant email to management + server-side Meta Lead.
  void fanOutLead({
    source: 'growth_guide',
    fullName: data.full_name,
    email: data.email,
    whatsapp: data.whatsapp,
    extra: { 'المسمى الوظيفي': data.job_title, 'حجم الشركة': data.company_size ?? null },
    sourceUrl: `https://bs-platform.com/${data.locale}/growth-guide`,
  }).catch(() => {})

  // Tell the team a lead came in — best-effort, never blocks the download.
  void notifyAllAdmins({
    title: 'New guide download',
    titleAr: 'تحميل جديد للدليل',
    body: `${data.full_name} (${data.email}) downloaded the growth guide.`,
    bodyAr: `${data.full_name} (${data.email}) حمّل دليل النمو.`,
    type: 'landing_lead',
  }).catch(() => {})

  return {
    success: true,
    pdfUrl: map.get('growth_guide_pdf_url') || '',
    bookingUrl: map.get('growth_guide_booking_url') || '',
  }
}
