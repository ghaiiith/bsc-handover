import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Scans recent video_security_logs for content-leak / abuse signals and raises
 * deduped alerts (video_leak_alerts) + admin notifications. Run periodically by
 * /api/cron/video-leak-scan.
 *
 * Signals (per user, in the window):
 *  - session_sharing   : playback observed from many distinct IPs
 *  - device_sharing    : repeated session_device_mismatch (cookie copied)
 *  - probing           : bursts of key_validation_failed / hotlink_attempt
 */

const WINDOW_MINUTES = 60
const DISTINCT_IP_THRESHOLD = 4
const DEVICE_MISMATCH_THRESHOLD = 3
const PROBING_THRESHOLD = 20
const DEDUPE_HOURS = 6

interface LogRow {
  user_id: string | null
  event_type: string
  client_ip: string | null
}

interface Flag {
  userId: string
  reason: 'session_sharing' | 'device_sharing' | 'probing'
  details: Record<string, unknown>
}

export interface LeakScanResult {
  scanned: number
  flagged: number
  alerts: { userId: string; reason: string }[]
}

export async function scanForVideoLeaks(): Promise<LeakScanResult> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()

  const { data, error } = await admin
    .from('video_security_logs')
    .select('user_id, event_type, client_ip')
    .gte('created_at', since)
    .not('user_id', 'is', null)
    .limit(50_000)

  if (error || !data) {
    return { scanned: 0, flagged: 0, alerts: [] }
  }

  const rows = data as LogRow[]
  const byUser = new Map<
    string,
    { ips: Set<string>; deviceMismatch: number; probing: number }
  >()

  for (const r of rows) {
    if (!r.user_id) continue
    let agg = byUser.get(r.user_id)
    if (!agg) {
      agg = { ips: new Set(), deviceMismatch: 0, probing: 0 }
      byUser.set(r.user_id, agg)
    }
    if (r.client_ip) agg.ips.add(r.client_ip)
    if (r.event_type === 'session_device_mismatch') agg.deviceMismatch++
    if (r.event_type === 'key_validation_failed' || r.event_type === 'hotlink_attempt') {
      agg.probing++
    }
  }

  const flags: Flag[] = []
  for (const [userId, agg] of byUser) {
    if (agg.ips.size >= DISTINCT_IP_THRESHOLD) {
      flags.push({
        userId,
        reason: 'session_sharing',
        details: { distinctIps: agg.ips.size, windowMinutes: WINDOW_MINUTES },
      })
    }
    if (agg.deviceMismatch >= DEVICE_MISMATCH_THRESHOLD) {
      flags.push({
        userId,
        reason: 'device_sharing',
        details: { deviceMismatches: agg.deviceMismatch, windowMinutes: WINDOW_MINUTES },
      })
    }
    if (agg.probing >= PROBING_THRESHOLD) {
      flags.push({
        userId,
        reason: 'probing',
        details: { probingEvents: agg.probing, windowMinutes: WINDOW_MINUTES },
      })
    }
  }

  if (flags.length === 0) {
    return { scanned: rows.length, flagged: 0, alerts: [] }
  }

  // Dedupe: skip a (user, reason) already alerted within DEDUPE_HOURS.
  const dedupeSince = new Date(Date.now() - DEDUPE_HOURS * 3_600_000).toISOString()
  const { data: recent } = await admin
    .from('video_leak_alerts')
    .select('user_id, reason')
    .gte('created_at', dedupeSince)
  const seen = new Set((recent ?? []).map((r) => `${r.user_id}:${r.reason}`))

  const fresh = flags.filter((f) => !seen.has(`${f.userId}:${f.reason}`))
  if (fresh.length === 0) {
    return { scanned: rows.length, flagged: flags.length, alerts: [] }
  }

  await admin.from('video_leak_alerts').insert(
    fresh.map((f) => ({
      user_id: f.userId,
      reason: f.reason,
      details: f.details,
      window_minutes: WINDOW_MINUTES,
    }))
  )

  // Notify every active admin.
  const { data: admins } = await admin
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)

  if (admins && admins.length > 0) {
    const reasonLabel: Record<Flag['reason'], { en: string; ar: string }> = {
      session_sharing: {
        en: 'Possible account/session sharing (many IPs)',
        ar: 'احتمال مشاركة حساب/جلسة (عناوين IP متعددة)',
      },
      device_sharing: {
        en: 'Session cookie used on multiple devices',
        ar: 'استُخدمت جلسة على أجهزة متعددة',
      },
      probing: {
        en: 'Suspicious video access probing',
        ar: 'محاولات وصول مشبوهة للفيديو',
      },
    }
    const rows: Record<string, unknown>[] = []
    for (const f of fresh) {
      const label = reasonLabel[f.reason]
      for (const a of admins) {
        rows.push({
          user_id: a.id,
          title: 'Content-leak alert',
          title_ar: 'تنبيه تسريب محتوى',
          body: `${label.en} — user ${f.userId.slice(0, 8)}`,
          body_ar: `${label.ar} — مستخدم ${f.userId.slice(0, 8)}`,
          type: `video_leak_alert:${f.reason}`,
        })
      }
    }
    if (rows.length > 0) {
      await admin.from('notifications').insert(rows)
    }
  }

  return {
    scanned: rows.length,
    flagged: flags.length,
    alerts: fresh.map((f) => ({ userId: f.userId, reason: f.reason })),
  }
}
