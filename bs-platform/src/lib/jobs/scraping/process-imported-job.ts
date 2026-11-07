import 'server-only'

import { z } from 'zod'
import { callClaudeChat } from '@/lib/chat/anthropic-client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AiJobParseResult } from '@/types/job-scraping'

const aiResultSchema = z.object({
  is_job_posting: z.boolean(),
  confidence: z.number().min(0).max(1),
  title: z.string().nullable(),
  title_ar: z.string().nullable(),
  company_name: z.string().nullable(),
  city: z.string().nullable(),
  job_type: z.enum(['full_time', 'part_time', 'remote', 'internship']).nullable(),
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  skills: z.array(z.string()).default([]),
  description: z.string().nullable(),
  description_ar: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_link: z.string().nullable(),
  whatsapp_number: z.string().nullable(),
  deadline: z.string().nullable(),
})

const SYSTEM_PROMPT = `You are a job posting parser for an Iraqi job board (Business Skills).
Extract structured job information from raw text (Telegram posts, RSS, LinkedIn listings).
Respond ONLY with valid JSON matching this exact schema — no markdown:
{
  "is_job_posting": boolean,
  "confidence": number (0-1),
  "title": string | null,
  "title_ar": string | null,
  "company_name": string | null,
  "city": string | null,
  "job_type": "full_time" | "part_time" | "remote" | "internship" | null,
  "salary_min": number | null,
  "salary_max": number | null,
  "skills": string[],
  "description": string | null,
  "description_ar": string | null,
  "contact_email": string | null,
  "contact_phone": string | null,
  "contact_link": string | null,
  "whatsapp_number": string | null,
  "deadline": string | null (ISO date YYYY-MM-DD if found)
}
If the text is NOT a job posting (spam, news, ad): set is_job_posting false, confidence low.
If Arabic post: fill title_ar/description_ar from original; provide English in title/description.
Use null for unknown fields. Minimum description length for real jobs: 30 chars in at least one language.`

function parseAiJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

export async function processImportedJob(importedJobId: string): Promise<{
  ok: boolean
  status?: string
  jobId?: string
}> {
  const admin = createAdminClient()

  const { data: row, error } = await admin
    .from('imported_jobs')
    .select('*')
    .eq('id', importedJobId)
    .single()

  if (error || !row) {
    return { ok: false }
  }

  if (row.ai_processed) {
    return { ok: true, status: row.status as string }
  }

  await admin
    .from('imported_jobs')
    .update({ status: 'processing' })
    .eq('id', importedJobId)

  const result = await callClaudeChat(
    SYSTEM_PROMPT,
    [{ role: 'user', content: row.raw_content as string }],
    1200
  )

  if (!result.ok) {
    await admin
      .from('imported_jobs')
      .update({ status: 'pending', ai_processed: false })
      .eq('id', importedJobId)
    return { ok: false }
  }

  const raw = parseAiJson(result.reply)
  const parsed = aiResultSchema.safeParse(raw)

  if (!parsed.success) {
    await admin
      .from('imported_jobs')
      .update({
        status: 'rejected',
        ai_processed: true,
        ai_result: { error: 'invalid_ai_response' },
      })
      .eq('id', importedJobId)
    return { ok: false, status: 'rejected' }
  }

  const ai: AiJobParseResult = parsed.data

  if (!ai.is_job_posting || ai.confidence < 0.5) {
    await admin
      .from('imported_jobs')
      .update({
        status: 'rejected',
        ai_processed: true,
        ai_result: ai,
      })
      .eq('id', importedJobId)
    return { ok: true, status: 'rejected' }
  }

  const title = ai.title ?? ai.title_ar ?? 'Imported Job'
  const titleAr = ai.title_ar ?? ai.title ?? title
  const description = ai.description ?? ai.description_ar ?? row.raw_content.slice(0, 2000)
  const descriptionAr = ai.description_ar ?? ai.description ?? description

  const { data: admins } = await admin.from('users').select('id').eq('role', 'admin').limit(1)
  const adminId = admins?.[0]?.id as string | undefined

  const contactLink = ai.contact_link ?? (row.source_url as string | null) ?? 'https://bs-platform.com'
  const contactEmail = ai.contact_email ?? 'jobs@bs-platform.com'

  const { data: draftJob, error: jobError } = await admin
    .from('jobs')
    .insert({
      admin_id: adminId ?? null,
      title,
      title_ar: titleAr,
      company_name: ai.company_name ?? 'Unknown',
      city: ai.city ?? 'Baghdad',
      job_type: ai.job_type ?? 'full_time',
      salary_min: ai.salary_min,
      salary_max: ai.salary_max,
      skills: ai.skills.map((s: string) => s.toLowerCase()),
      description: description.length >= 30 ? description : `${description}\n\n(Imported — needs review)`,
      description_ar:
        descriptionAr.length >= 30 ? descriptionAr : `${descriptionAr}\n\n(مستورد — يحتاج مراجعة)`,
      deadline: ai.deadline,
      contact_email: contactEmail,
      contact_phone: ai.contact_phone,
      contact_link: contactLink,
      whatsapp_number: ai.whatsapp_number?.replace(/\D/g, '') || null,
      // Report BS-62: imported jobs are external — the platform Apply box is
      // hidden and only the original contact route (link/WhatsApp) is shown, so
      // applications aren't silently lost to an employer who never sees them.
      is_external: true,
      status: 'draft',
    })
    .select('id')
    .single()

  if (jobError || !draftJob) {
    await admin
      .from('imported_jobs')
      .update({
        status: 'pending',
        ai_processed: true,
        ai_result: ai,
      })
      .eq('id', importedJobId)
    return { ok: false }
  }

  await admin
    .from('imported_jobs')
    .update({
      status: 'reviewed',
      ai_processed: true,
      ai_result: ai,
      published_job_id: draftJob.id,
    })
    .eq('id', importedJobId)

  return { ok: true, status: 'reviewed', jobId: draftJob.id as string }
}

export async function processPendingImports(limit = 10): Promise<number> {
  const admin = createAdminClient()

  const { data: pending } = await admin
    .from('imported_jobs')
    .select('id')
    .eq('status', 'pending')
    .eq('ai_processed', false)
    .order('created_at', { ascending: true })
    .limit(limit)

  let processed = 0
  for (const row of pending ?? []) {
    await processImportedJob(row.id as string)
    processed += 1
  }

  return processed
}
