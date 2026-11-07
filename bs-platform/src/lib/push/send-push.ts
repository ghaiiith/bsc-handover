import { createAdminClient } from '@/lib/supabase/admin'
import { resolveNotificationLink } from '@/lib/notifications/resolve-link'
import { getFirebaseMessaging } from '@/lib/push/firebase-admin'
import {
  getNotificationPreferences,
  shouldSendPushForType,
} from '@/lib/push/notification-preferences'
import { isFirebaseAdminConfigured } from '@/lib/push/firebase-config'

export interface PushNotificationPayload {
  userId: string
  title: string
  titleAr: string
  body: string
  bodyAr: string
  type: string
  isAdmin?: boolean
}

async function removeInvalidToken(token: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('fcm_tokens').delete().eq('token', token)
}

export async function sendPushToUser(
  payload: PushNotificationPayload
): Promise<void> {
  if (!isFirebaseAdminConfigured()) return

  const messaging = getFirebaseMessaging()
  if (!messaging) return

  const prefs = await getNotificationPreferences(payload.userId)
  if (!shouldSendPushForType(prefs, payload.type)) return

  const admin = createAdminClient()
  const { data: tokens } = await admin
    .from('fcm_tokens')
    .select('token, locale')
    .eq('user_id', payload.userId)

  if (!tokens?.length) return

  await Promise.allSettled(
    tokens.map(async (row) => {
      const tokenLocale = (row.locale as string) === 'en' ? 'en' : 'ar'
      const title = tokenLocale === 'ar' ? payload.titleAr : payload.title
      const body = tokenLocale === 'ar' ? payload.bodyAr : payload.body
      const url =
        resolveNotificationLink(payload.type, tokenLocale, {
          isAdmin: payload.isAdmin,
        }) ?? `/${tokenLocale}/dashboard/notifications`

      try {
        await messaging.send({
          token: row.token as string,
          notification: { title, body },
          data: {
            type: payload.type,
            url,
          },
          webpush: {
            fcmOptions: { link: url },
            notification: {
              icon: '/favicon.ico',
              badge: '/favicon.ico',
            },
          },
        })

        await admin
          .from('fcm_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('token', row.token)
      } catch (err: unknown) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : ''
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          await removeInvalidToken(row.token as string)
        } else {
          console.error('[push] Send failed:', err)
        }
      }
    })
  )
}

export async function sendPushToUsers(
  userIds: string[],
  payload: Omit<PushNotificationPayload, 'userId'>
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) => sendPushToUser({ ...payload, userId }))
  )
}
