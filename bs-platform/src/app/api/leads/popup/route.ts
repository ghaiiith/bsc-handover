import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'
import { getClientIp } from '@/lib/portfolio/cv-download-rate-limit'
import { fanOutLead } from '@/lib/landing/lead-notify'
import { capiUserFromRequest } from '@/lib/tracking/meta-capi'

/**
 * Marketing request item 6: the exit-intent pop-up on course/service pages.
 * Same storage as every other lead (landing_leads, source = popup:<page>), the
 * same instant email + Meta Lead fan-out, and the same anti-abuse rate limit.
 */
const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, '').length >= 7, 'invalid_phone'),
  page: z.string().max(300),
  locale: z.enum(['ar', 'en']).default('ar'),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rate = await checkDurableRateLimit({ key: `popup:lead:ip:${ip}`, max: 5, windowSeconds: 600 })
  if (!rate.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  const d = parsed.data
  const email = d.email.toLowerCase()
  const source = `popup:${d.page.split('?')[0].slice(0, 80)}`

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('landing_leads')
    .select('id')
    .eq('email', email)
    .eq('source', source)
    .maybeSingle()

  const fields = { full_name: d.full_name, whatsapp: d.whatsapp, locale: d.locale, downloaded_at: new Date().toISOString() }
  const saved = existing?.id
    ? await admin.from('landing_leads').update(fields).eq('id', existing.id).select('id').maybeSingle()
    : await admin.from('landing_leads').insert({ ...fields, email, source }).select('id').maybeSingle()

  if (saved.error || !saved.data) {
    console.error('[popup/lead] save failed:', saved.error?.message ?? 'no row')
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  void fanOutLead({
    source,
    fullName: d.full_name,
    email: d.email,
    whatsapp: d.whatsapp,
    capi: capiUserFromRequest(request),
    sourceUrl: `https://bs-platform.com${d.page}`,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
