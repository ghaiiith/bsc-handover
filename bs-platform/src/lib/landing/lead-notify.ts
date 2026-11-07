import 'server-only'

import { getPlatformSettings } from '@/lib/admin/platform-settings'
import { sendEmail, emailLayout } from '@/lib/email'
import { sendMetaConversion, type CapiUser } from '@/lib/tracking/meta-capi'

/**
 * Marketing request item 1: every captured lead is (a) stored in the site
 * database, (b) sent instantly to the management inbox(es) the admin lists in
 * settings, and (c) reported to Meta as a server-side Lead so the ad campaign
 * that produced it gets credit even on iOS. Everything here is best-effort
 * and runs after the row is safely saved.
 */
export async function fanOutLead(input: {
  source: string
  fullName: string
  email: string
  whatsapp?: string | null
  extra?: Record<string, string | null | undefined>
  capi?: Partial<CapiUser>
  sourceUrl?: string
}): Promise<void> {
  const s = await getPlatformSettings()

  const recipients = (s.lead_notify_emails ?? '')
    .split(/[,\s]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))

  const rows = [
    ['الاسم', input.fullName],
    ['البريد', input.email],
    ['واتساب', input.whatsapp ?? '—'],
    ['المصدر', input.source],
    ...Object.entries(input.extra ?? {}).filter(([, v]) => v).map(([k, v]) => [k, String(v)]),
  ]

  const jobs: Promise<unknown>[] = []

  if (recipients.length) {
    const html = emailLayout(
      `<h2 style="margin:0 0 12px">عميل محتمل جديد 🎯</h2>
       <table style="border-collapse:collapse;font-size:14px">
         ${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${k}</td><td style="padding:4px 0"><strong>${escape(v)}</strong></td></tr>`).join('')}
       </table>
       <p style="color:#64748b;font-size:12px;margin-top:16px">تصلك هذه الرسالة لأن بريدك مُدرج في «إشعار العملاء المحتملين» بإعدادات المنصة.</p>`
    )
    for (const to of recipients) {
      jobs.push(
        sendEmail({ to, subject: `عميل محتمل جديد: ${input.fullName}`, html }).catch(() => undefined)
      )
    }
  }

  jobs.push(
    sendMetaConversion({
      event: 'Lead',
      user: { email: input.email, phone: input.whatsapp ?? null, ...(input.capi ?? {}) },
      sourceUrl: input.sourceUrl,
      contentName: input.source,
    }).catch(() => undefined)
  )

  await Promise.allSettled(jobs)
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
