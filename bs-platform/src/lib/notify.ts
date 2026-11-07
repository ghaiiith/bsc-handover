import { createNotification, type CreateNotificationInput } from '@/lib/notifications'
import { sendEmail, type SendEmailInput } from '@/lib/email'

export async function notifyAndEmail(
  notification: CreateNotificationInput,
  email?: SendEmailInput | null
): Promise<void> {
  const tasks: Promise<unknown>[] = [createNotification(notification)]

  if (email) {
    tasks.push(sendEmail(email))
  }

  await Promise.allSettled(tasks)
}

export async function notifyManyAndEmail(
  notifications: CreateNotificationInput[],
  emails: SendEmailInput[] = []
): Promise<void> {
  const tasks: Promise<unknown>[] = notifications.map((n) => createNotification(n))
  tasks.push(...emails.map((e) => sendEmail(e)))

  await Promise.allSettled(tasks)
}
