import { notifyAllAdmins } from '@/lib/admin/notify-admins'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'

export async function sendInstructorRequestSubmittedNotifications(
  requestId: string,
  applicantName: string
): Promise<void> {
  await notifyAllAdmins({
    title: 'New instructor request',
    titleAr: 'طلب مدرب جديد',
    body: `${applicantName} submitted an instructor application.`,
    bodyAr: `قدّم ${applicantName} طلباً ليصبح مدرباً.`,
    type: buildNotificationType(NotificationKind.instructorRequest, requestId),
  })
}
