import { NextResponse } from 'next/server'
import { capiUserFromRequest, sendMetaConversion } from '@/lib/tracking/meta-capi'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { buildWelcomeEmail } from '@/lib/email/templates'
import { checkDurableRateLimit, getClientIp } from '@/lib/rate-limit/durable'

// Called right after registration (the client may not have a session cookie yet),
// so we can't require an authed session. Instead this is hardened three ways:
//  - per-IP rate limit (can't email-bomb via the sender),
//  - only sends to accounts created in the last few minutes (can't target an
//    arbitrary/established user by id — kills the bomb-by-userId vector),
//  - uniform { ok: true } response (no account-existence oracle).
const FRESH_ACCOUNT_WINDOW_MS = 5 * 60 * 1000

export async function POST(request: Request) {
  try {
    const rate = await checkDurableRateLimit({
      key: `auth-welcome:ip:${getClientIp(request)}`,
      max: 5,
      windowSeconds: 60,
    })
    if (!rate.allowed) return NextResponse.json({ ok: true })

    const { userId, locale = 'ar' } = await request.json().catch(() => ({}))
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ ok: true })
    }

    const admin = createAdminClient()
    const { data: user } = await admin
      .from('users')
      .select('email, full_name, created_at')
      .eq('id', userId)
      .single()

    // Only send to a genuinely just-registered account.
    const createdAt = user?.created_at ? new Date(user.created_at as string).getTime() : 0
    const isFresh = createdAt > 0 && Date.now() - createdAt < FRESH_ACCOUNT_WINDOW_MS

    if (user?.email && isFresh) {
      const welcome = buildWelcomeEmail({
        name: user.full_name ?? 'مستخدم',
        locale,
      })
      await sendEmail({ to: user.email, subject: welcome.subject, html: welcome.html })

      // Marketing item 3: a fresh account is a CompleteRegistration for Meta,
      // reported server-side so iOS tracking blocks do not hide it.
      void sendMetaConversion({
        event: 'CompleteRegistration',
        eventId: `reg_${userId}`,
        user: { email: user.email as string, externalId: userId, ...capiUserFromRequest(request) },
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[auth/welcome]', error)
    return NextResponse.json({ ok: true })
  }
}
