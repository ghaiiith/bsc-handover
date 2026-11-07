import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { sendEmail, emailLayout, emailButton } from '@/lib/email'
import { isProUser } from '@/lib/subscription/pro-access'
import { scoreMatch, type AlertCandidate, type AlertJob } from '@/lib/job-alerts/matching'
import { escapeTelegramHtml, isTelegramConfigured, sendTelegramMessage } from '@/lib/job-alerts/telegram'

/**
 * Round 9 (BS-104): the alert sweep.
 *
 * Runs on a schedule. Takes every job that went live since the last run —
 * platform posts AND Telegram-sourced imports alike, because both flow through
 * `published_at` — scores it against every opted-in candidate, and for scores
 * at or above the candidate's threshold (default 80) sends:
 *   • in-app        always
 *   • Telegram      when the bot is configured and the candidate linked it
 *   • email         only when the candidate's plan includes email alerts
 *
 * Every attempt is recorded in job_alert_deliveries by ids + status. That
 * table never stores names, skills, or contact details.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://bs-platform.com'
const MAX_JOBS_PER_RUN = 200
const MAX_CANDIDATES = 2000

export interface SweepResult {
  jobsScanned: number
  candidatesScanned: number
  matches: number
  sent: { in_app: number; telegram: number; email: number }
  skipped: { plan: number; unlinked: number; failed: number }
  since: string
}

async function readCursor(): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'job_alerts_last_run')
    .maybeSingle()
  const v = data?.value as string | undefined
  return v && !Number.isNaN(Date.parse(v)) ? v : '1970-01-01T00:00:00Z'
}

async function writeCursor(iso: string) {
  const admin = createAdminClient()
  await admin.from('platform_settings').upsert({ key: 'job_alerts_last_run', value: iso })
}

async function alreadySent(userId: string, jobId: string, channel: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('job_alert_deliveries')
    .select('id')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .eq('channel', channel)
    .maybeSingle()
  return Boolean(data)
}

async function record(
  userId: string,
  jobId: string,
  channel: 'in_app' | 'telegram' | 'email',
  status: 'sent' | 'skipped_plan' | 'skipped_unlinked' | 'failed',
  score: number,
  error?: string
) {
  const admin = createAdminClient()
  await admin.from('job_alert_deliveries').upsert(
    { user_id: userId, job_id: jobId, channel, status, score, error: error ?? null },
    { onConflict: 'user_id,job_id,channel' }
  )
}

export async function runJobAlertSweep(now = new Date()): Promise<SweepResult> {
  const admin = createAdminClient()
  const since = await readCursor()
  const nowIso = now.toISOString()

  const result: SweepResult = {
    jobsScanned: 0,
    candidatesScanned: 0,
    matches: 0,
    sent: { in_app: 0, telegram: 0, email: 0 },
    skipped: { plan: 0, unlinked: 0, failed: 0 },
    since,
  }

  // Jobs that went live since the cursor. is_external is deliberately NOT
  // filtered — Telegram-sourced listings must alert too.
  const { data: jobs } = await admin
    .from('jobs')
    .select('id, title, title_ar, skills, city, is_external, company_name')
    .eq('status', 'active')
    .gt('published_at', since)
    .lte('published_at', nowIso)
    .order('published_at', { ascending: true })
    .limit(MAX_JOBS_PER_RUN)

  const jobRows = (jobs ?? []) as Array<Record<string, unknown>>
  result.jobsScanned = jobRows.length
  if (jobRows.length === 0) {
    await writeCursor(nowIso)
    return result
  }

  const { data: users } = await admin
    .from('users')
    .select('id, email, full_name, full_name_ar, skills, preferred_role, headline, location, job_alerts_min_score, telegram_chat_id, availability')
    .eq('job_alerts_enabled', true)
    .eq('is_active', true)
    .limit(MAX_CANDIDATES)

  const candidates = (users ?? []) as Array<Record<string, unknown>>
  result.candidatesScanned = candidates.length

  for (const job of jobRows) {
    const alertJob: AlertJob = {
      id: job.id as string,
      title: job.title as string,
      titleAr: (job.title_ar as string) ?? null,
      skills: Array.isArray(job.skills) ? (job.skills as string[]) : [],
      city: (job.city as string) ?? null,
    }
    if (alertJob.skills.length === 0) continue // nothing to match on

    for (const u of candidates) {
      if (u.availability === false) continue
      const cand: AlertCandidate = {
        id: u.id as string,
        skills: Array.isArray(u.skills) ? (u.skills as string[]) : [],
        preferredRole: (u.preferred_role as string) ?? null,
        headline: (u.headline as string) ?? null,
        location: (u.location as string) ?? null,
      }
      const threshold = Math.min(100, Math.max(50, Number(u.job_alerts_min_score ?? 80)))
      const { score, matched } = scoreMatch(alertJob, cand)
      if (score < threshold) continue
      result.matches += 1

      const title = alertJob.titleAr || alertJob.title
      const url = `${SITE}/ar/jobs/${alertJob.id}`
      const company = (job.company_name as string) ?? ''

      // in-app
      if (!(await alreadySent(cand.id, alertJob.id, 'in_app'))) {
        const r = await createNotification({
          userId: cand.id,
          title: `High-match job: ${alertJob.title}`,
          titleAr: `وظيفة مطابقة بنسبة ${score}%: ${title}`,
          body: `${company} — matches ${matched.length} of your skills (${score}%).`,
          bodyAr: `${company} — تطابق ${matched.length} من مهاراتك (${score}%).`,
          type: `job_alert:${alertJob.id}`,
        })
        await record(cand.id, alertJob.id, 'in_app', r.success ? 'sent' : 'failed', score, r.error)
        if (r.success) result.sent.in_app += 1
        else result.skipped.failed += 1
      }

      // telegram
      if (!(await alreadySent(cand.id, alertJob.id, 'telegram'))) {
        if (!isTelegramConfigured() || !u.telegram_chat_id) {
          await record(cand.id, alertJob.id, 'telegram', 'skipped_unlinked', score)
          result.skipped.unlinked += 1
        } else {
          const text =
            `🎯 <b>وظيفة مطابقة بنسبة ${score}%</b>\n` +
            `${escapeTelegramHtml(title)}${company ? ` — ${escapeTelegramHtml(company)}` : ''}\n` +
            (matched.length ? `المهارات المطابقة: ${escapeTelegramHtml(matched.join('، '))}\n` : '') +
            `\n<a href="${url}">عرض الوظيفة</a>`
          const r = await sendTelegramMessage(u.telegram_chat_id as string, text)
          await record(cand.id, alertJob.id, 'telegram', r.ok ? 'sent' : 'failed', score, r.ok ? undefined : r.error)
          if (r.ok) result.sent.telegram += 1
          else result.skipped.failed += 1
        }
      }

      // email — paid plan only
      if (!(await alreadySent(cand.id, alertJob.id, 'email'))) {
        const paid = await isProUser(cand.id)
        if (!paid || !u.email) {
          await record(cand.id, alertJob.id, 'email', 'skipped_plan', score)
          result.skipped.plan += 1
        } else {
          const name = (u.full_name_ar as string) || (u.full_name as string) || ''
          const html = emailLayout(
            `<h2 style="margin:0 0 12px">وظيفة مطابقة بنسبة ${score}% 🎯</h2>
             <p>${name ? `مرحباً ${escapeTelegramHtml(name)}،` : 'مرحباً،'}</p>
             <p>نُشرت وظيفة تطابق ملفك: <strong>${escapeTelegramHtml(title)}</strong>${company ? ` — ${escapeTelegramHtml(company)}` : ''}.</p>
             ${matched.length ? `<p>المهارات المطابقة: ${escapeTelegramHtml(matched.join('، '))}</p>` : ''}
             ${emailButton(url, 'عرض الوظيفة')}
             <p style="color:#64748b;font-size:12px">تصلك هذه الرسالة لأنك فعّلت تنبيهات الوظائف. يمكنك إيقافها من إعدادات حسابك.</p>`
          )
          const r = await sendEmail({ to: u.email as string, subject: `وظيفة مطابقة ${score}%: ${title}`, html })
          await record(cand.id, alertJob.id, 'email', r.success ? 'sent' : 'failed', score, r.error)
          if (r.success) result.sent.email += 1
          else result.skipped.failed += 1
        }
      }
    }
  }

  await writeCursor(nowIso)
  return result
}
