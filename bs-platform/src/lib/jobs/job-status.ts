import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createNotifications } from '@/lib/notifications'
import { NotificationKind } from '@/lib/notifications/types'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const BATCH = 500

/**
 * Report BS-64: once a month, ask active job-seekers whether they found a job.
 * Only pings seekers who opted in (job_status_ask_enabled) and who haven't been
 * asked in the last 30 days. The answer (recorded via answerJobStatus) updates
 * their open-to-work flag and stops pinging anyone no longer looking.
 */
export async function runMonthlyJobStatusPing(): Promise<{ notified: number }> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()

  const { data: seekers } = await admin
    .from('users')
    .select('id')
    .in('role', ['student', 'freelancer'])
    .eq('is_active', true)
    .eq('job_status_ask_enabled', true)
    .or(`job_status_last_asked_at.is.null,job_status_last_asked_at.lt.${cutoff}`)
    .limit(BATCH)

  const ids = (seekers ?? []).map((s) => s.id as string)
  if (ids.length === 0) return { notified: 0 }

  await createNotifications(
    ids.map((id) => ({
      userId: id,
      title: 'Did you find a job?',
      titleAr: 'هل حصلت على وظيفة؟',
      body: 'Tap to let us know — it helps us match you better.',
      bodyAr: 'اضغط لإخبارنا — هذا يساعدنا نطابقك أفضل.',
      type: NotificationKind.jobStatusCheck,
    }))
  )

  await admin
    .from('users')
    .update({ job_status_last_asked_at: new Date().toISOString() })
    .in('id', ids)

  return { notified: ids.length }
}
