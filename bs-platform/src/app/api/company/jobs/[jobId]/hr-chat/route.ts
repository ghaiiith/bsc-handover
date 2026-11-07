import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'
import { checkAiAllowance, consumeAiAllowance } from '@/lib/subscription/entitlements'
import { loadHrJobDataset } from '@/lib/hr-chat/job-dataset'
import {
  applyFilters,
  effectiveYears,
  isFilterQuestion,
  parseFilters,
} from '@/lib/hr-chat/candidate-filters'
import { assistantChat, isLearningAssistantConfigured } from '@/lib/ai/learning-assistant-server'
import { sanitizeHistory } from '@/lib/chat/history'
import { resolveChatLocale } from '@/lib/chat/chat-schemas'

/**
 * Round 9 (BS-108): the job-scoped HR chatbot.
 *
 * Order of checks is the security model:
 *   1. signed in           → 401
 *   2. plan includes it    → 403 with the reason (server-side; UI text can't override)
 *   3. owns THIS job       → 404 (not 403 — do not confirm another company's job exists)
 *   4. monthly allowance   → 429-style refusal with the numbers
 *
 * Then the deterministic filter runs over the job's own dataset and the model
 * is asked only to explain the shortlist it is handed. It never sees, and so
 * can never leak, data from any other job.
 */

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
})

export async function POST(request: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params
  const locale = resolveChatLocale(request)
  const isAr = locale === 'ar'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Plan gate before anything touches candidate data.
  const allowance = await checkAiAllowance(user.id, 'hr_chatbot')
  if (!allowance.allowed) {
    return NextResponse.json(
      { error: allowance.reason ?? 'forbidden', allowance },
      { status: allowance.reason === 'limit_reached' ? 429 : 403 }
    )
  }

  const rate = await checkDurableRateLimit({
    key: `hr-chat:${user.id}:${jobId}`,
    max: 20,
    windowSeconds: 60,
  })
  if (!rate.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'validation_failed' }, { status: 400 })

  const messages = sanitizeHistory(parsed.data.messages)
  const question = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  if (!question) return NextResponse.json({ error: 'no_question' }, { status: 400 })

  // Ownership + the job's own dataset.
  const loaded = await loadHrJobDataset(jobId, user.id)
  if (!loaded.ok) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const { job, candidates, counts } = loaded.data

  // Deterministic filtering with evidence.
  const filters = parseFilters(question, job.skills)
  const filtering = isFilterQuestion(filters)
  const hits = filtering ? applyFilters(candidates, filters, locale) : []

  const shortlist = hits.slice(0, 10).map((h) => ({
    id: h.candidate.id,
    name: h.candidate.name,
    headline: h.candidate.headline ?? null,
    years: h.years,
    matchedSkills: h.matchedSkills,
    source: h.candidate.source,
    matchScore: h.candidate.matchScore ?? null,
    applicationStatus: h.candidate.applicationStatus ?? null,
    evidence: h.evidence,
  }))

  // A compact, job-only briefing for the model. Names and facts only — no ids,
  // no contact details, and nothing from outside this job.
  const roster = candidates.slice(0, 40).map((c) => ({
    name: c.name,
    headline: c.headline ?? undefined,
    skills: c.skills.slice(0, 12),
    years: effectiveYears(c),
    location: c.location ?? undefined,
    status: c.applicationStatus ?? undefined,
    source: c.source,
    match: c.matchScore ?? undefined,
  }))

  const brief = isAr
    ? `أنت مساعد HR داخل منصة Business Skills، مقيّد بوظيفة واحدة فقط: «${job.titleAr}» (${job.city ?? ''}). المهارات المطلوبة: ${job.skills.join('، ') || '—'}.
عندك ${counts.applicants} متقدّم و${counts.suggested} مرشّح مقترح. البيانات التالية هي كل ما يحق لك معرفته، ولا تفترض أي شيء خارجها.
${filtering ? `طُبّق فلتر حسابي مسبقاً على السؤال ونتج عنه ${hits.length} مرشّح مطابق. اعتمد هذه القائمة كما هي ولا تضف أو تحذف منها؛ اشرح لماذا طابق كل واحد مستخدماً الأدلة المرفقة.` : 'السؤال عام؛ جاوب من بيانات هذه الوظيفة ومتقدميها فقط.'}
جاوب بإيجاز وبنقاط، واذكر الاسم والدليل لكل مرشّح تذكره. إذا ما في مطابق، قل ذلك صراحة واقترح أقرب البدائل من القائمة مع توضيح النقص.`
    : `You are the HR assistant inside the Business Skills platform, scoped to ONE job only: "${job.title}" (${job.city ?? ''}). Required skills: ${job.skills.join(', ') || '—'}.
There are ${counts.applicants} applicants and ${counts.suggested} suggested candidates. The data below is everything you are permitted to know; assume nothing beyond it.
${filtering ? `A deterministic filter was already applied to the question and produced ${hits.length} matching candidates. Use that list exactly as given — do not add or remove anyone; explain why each one qualified using the attached evidence.` : 'This is a general question; answer only from this job and its candidates.'}
Answer briefly in bullet points, naming each candidate with their evidence. If nobody matches, say so plainly and suggest the closest alternatives from the list, stating what they lack.`

  const payload = {
    roster,
    shortlist: shortlist.map(({ id: _id, ...s }) => s),
    filters: filtering ? filters : null,
  }

  let answer = ''
  if (isLearningAssistantConfigured()) {
    const res = await assistantChat({
      message: `${brief}\n\nDATA:\n${JSON.stringify(payload)}\n\n---\n${question}`,
      history: messages.slice(0, -1).slice(-10),
      locale: isAr ? 'ar' : 'en',
      page: { path: `/dashboard/company-jobs/${jobId}/applicants`, section: 'hr-chat' },
    })
    if (res?.ok && res.answer?.trim()) answer = res.answer.trim()
  }

  // Deterministic fallback so a model outage still returns the shortlist.
  if (!answer) {
    if (filtering) {
      answer = hits.length
        ? (isAr ? `المطابقون (${hits.length}):\n` : `Matches (${hits.length}):\n`) +
          shortlist.map((s) => `• ${s.name} — ${s.evidence.join(isAr ? '؛ ' : '; ')}`).join('\n')
        : isAr
          ? 'لا يوجد مرشّح يطابق كل الشروط المطلوبة.'
          : 'No candidate matches all the requested criteria.'
    } else {
      answer = isAr
        ? `لهذه الوظيفة ${counts.applicants} متقدّم و${counts.suggested} مرشّح مقترح. اسألني مثلاً: «منو عنده Python وخبرة أكثر من ٥ سنوات؟»`
        : `This job has ${counts.applicants} applicants and ${counts.suggested} suggested candidates. Try: "who has Python and more than 5 years of experience?"`
    }
  }

  // Meter after a successful answer only — a refused or failed call is free.
  const spent = await consumeAiAllowance(user.id, 'hr_chatbot')

  return NextResponse.json({
    reply: answer,
    shortlist,
    filters: filtering ? filters : null,
    counts,
    allowance: { used: spent.used, limit: spent.limit, remaining: spent.remaining },
  })
}
