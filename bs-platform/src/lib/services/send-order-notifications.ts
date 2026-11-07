import { getAppUrl } from '@/lib/seo/metadata'
import { notifyAllAdmins } from '@/lib/admin/notify-admins'
import { createNotification } from '@/lib/notifications'
import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'
import { sendEmail } from '@/lib/email'
import { buildServiceOrderAdminEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'

export async function sendServiceOrderPlacedNotifications(
  orderId: string,
  serviceId: string,
  buyerId: string,
  requirements: string,
  locale = 'ar'
): Promise<void> {
  const admin = createAdminClient()

  const [{ data: service }, { data: buyer }, { data: admins }] = await Promise.all([
    admin.from('services').select('title, title_ar, seller_id').eq('id', serviceId).single(),
    admin.from('users').select('full_name').eq('id', buyerId).single(),
    admin.from('users').select('email').eq('role', 'admin'),
  ])

  if (!service) return

  const serviceTitle = service.title_ar ?? service.title
  const buyerName = buyer?.full_name ?? 'مستخدم'

  await createNotification({
    userId: buyerId,
    title: 'Order confirmed',
    titleAr: 'تم تأكيد طلبك',
    body: `Your order for "${service.title}" was placed successfully.`,
    bodyAr: `تم تأكيد طلبك على "${serviceTitle}" بنجاح.`,
    type: buildNotificationType(NotificationKind.serviceOrderBuyer, orderId),
  })

  if (service.seller_id) {
    await createNotification({
      userId: service.seller_id as string,
      title: 'New service order',
      titleAr: 'طلب خدمة جديد',
      body: `You received a new order for "${service.title}" from ${buyerName}.`,
      bodyAr: `وصلك طلب جديد على "${serviceTitle}" من ${buyerName}.`,
      type: buildNotificationType(NotificationKind.serviceOrderSeller, orderId),
    })
  }

  await notifyAllAdmins({
    title: 'New service order',
    titleAr: 'طلب خدمة جديد',
    body: `New order for "${service.title}" from ${buyerName}`,
    bodyAr: `طلب جديد على "${serviceTitle}" من ${buyerName}`,
    type: buildNotificationType(NotificationKind.serviceOrderAdmin, orderId),
  })

  const appUrl = getAppUrl()
  const emailPayload = buildServiceOrderAdminEmail({
    serviceTitle,
    buyerName,
    requirements,
    adminUrl: `${appUrl}/${locale}/admin/services`,
  })

  await Promise.allSettled(
    (admins ?? [])
      .filter((a) => a.email)
      .map((a) =>
        sendEmail({
          to: a.email!,
          subject: emailPayload.subject,
          html: emailPayload.html,
        })
      )
  )
}

export async function sendOrderStatusNotifications(
  orderId: string,
  newStatus: string
): Promise<void> {
  const admin = createAdminClient()

  const { data: order } = await admin
    .from('service_orders')
    .select('buyer_id, seller_id, service:services!service_id(title, title_ar)')
    .eq('id', orderId)
    .single()

  if (!order) return

  const service = Array.isArray(order.service) ? order.service[0] : order.service
  const serviceTitle = service?.title_ar ?? service?.title ?? 'خدمة'

  if (newStatus === 'in_progress' && order.buyer_id) {
    await createNotification({
      userId: order.buyer_id,
      title: 'Order accepted',
      titleAr: 'تم قبول طلبك',
      body: 'The seller accepted your order and will start soon.',
      bodyAr: `قبل البائع طلبك على "${serviceTitle}"! سيبدأ العمل قريباً.`,
      type: buildNotificationType(NotificationKind.serviceOrderAccepted, orderId),
    })
  }

  if (newStatus === 'delivered' && order.buyer_id) {
    await createNotification({
      userId: order.buyer_id,
      title: 'Order delivered',
      titleAr: 'تم تسليم طلبك',
      body: 'Your order has been delivered. Please confirm receipt.',
      bodyAr: 'تم تسليم طلبك! يرجى تأكيد الاستلام.',
      type: buildNotificationType(NotificationKind.serviceOrderDelivered, orderId),
    })
  }

  if (newStatus === 'cancelled') {
    if (order.seller_id) {
      await createNotification({
        userId: order.seller_id,
        title: 'Order cancelled',
        titleAr: 'تم إلغاء الطلب',
        body: `The buyer cancelled their order for "${service?.title ?? 'your service'}".`,
        bodyAr: `ألغى المشتري طلبه على "${serviceTitle}".`,
        type: buildNotificationType(NotificationKind.serviceOrderCancelled, orderId),
      })
    }
    if (order.buyer_id) {
      await createNotification({
        userId: order.buyer_id,
        title: 'Order cancelled',
        titleAr: 'تم إلغاء الطلب',
        body: 'Your service order was cancelled.',
        bodyAr: `تم إلغاء طلبك على "${serviceTitle}".`,
        type: buildNotificationType(NotificationKind.serviceOrderCancelled, orderId),
      })
    }
  }

  if (newStatus === 'completed') {
    if (order.buyer_id) {
      await createNotification({
        userId: order.buyer_id,
        title: 'Order completed',
        titleAr: 'اكتمل طلبك',
        body: `Your order for "${service?.title}" is complete.`,
        bodyAr: `اكتمل طلبك على "${serviceTitle}".`,
        type: buildNotificationType(NotificationKind.serviceOrderCompleted, orderId),
      })
    }
    if (order.seller_id) {
      await createNotification({
        userId: order.seller_id,
        title: 'Order completed',
        titleAr: 'اكتمل الطلب',
        body: `The buyer confirmed receipt for "${service?.title}".`,
        bodyAr: `أكد المشتري استلام طلب "${serviceTitle}".`,
        type: buildNotificationType(NotificationKind.serviceOrderCompleted, orderId),
      })
    }
    await notifyAllAdmins({
      title: 'Order completed',
      titleAr: 'اكتمل طلب خدمة',
      body: `Order for "${service?.title}" completed.`,
      bodyAr: `اكتمل طلب "${serviceTitle}".`,
      type: buildNotificationType(NotificationKind.serviceOrderCompleted, orderId),
    })
  }
}