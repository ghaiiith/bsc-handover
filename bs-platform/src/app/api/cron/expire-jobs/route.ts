import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { revalidateJobsListingCache } from '@/lib/cache/invalidate-listing-cache'
import { createNotifications } from '@/lib/notifications'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'

/**
 * Report BS-16: de-list jobs whose 30-day lifetime has elapsed.
 * Flips expired 'active' jobs to 'expired' and notifies the poster so they can
 * renew. Runs on a schedule (see vercel.json / cron.d).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    const { data: expired, error } = await admin
      .from('jobs')
      .update({ status: 'expired', updated_at: nowIso })
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lt('expires_at', nowIso)
      .select('id, title, title_ar, posted_by')

    if (error) {
      console.error('[cron/expire-jobs]', error.message)
      return NextResponse.json({ error: 'expire_failed' }, { status: 500 })
    }

    const rows = expired ?? []

    // Notify each poster (company reps) that their job expired and can be renewed.
    const notifyTargets = rows.filter((j) => j.posted_by)
    if (notifyTargets.length > 0) {
      await createNotifications(
        notifyTargets.map((j) => ({
          userId: j.posted_by as string,
          title: 'Your job posting expired',
          titleAr: 'انتهت صلاحية إعلان وظيفتك',
          body: `"${j.title ?? ''}" reached its 30-day limit. Renew it to make it visible again.`,
          bodyAr: `وصل "${j.title_ar ?? j.title ?? ''}" إلى حد الـ30 يوماً. جدّده لإعادة عرضه.`,
          type: buildNotificationType(NotificationKind.jobExpired),
        }))
      )
    }

    if (rows.length > 0) {
      revalidateJobsListingCache()
    }

    // Report BS-38: close out lapsed subscriptions (free grants included) so the
    // company's plan view shows the normal price again once the period ends.
    const { data: lapsed } = await admin
      .from('employer_subscriptions')
      .update({ status: 'expired', updated_at: nowIso })
      .eq('status', 'active')
      .not('current_period_end', 'is', null)
      .lt('current_period_end', nowIso)
      .select('id')

    return NextResponse.json({
      ok: true,
      expired: rows.length,
      subscriptionsExpired: lapsed?.length ?? 0,
    })
  } catch (err) {
    console.error('[cron/expire-jobs]', err)
    return NextResponse.json({ error: 'expire_failed' }, { status: 500 })
  }
}
