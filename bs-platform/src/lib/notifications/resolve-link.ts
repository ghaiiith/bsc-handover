/**
 * Resolves navigation path from a notification type string.
 * Type format: `kind` or `kind:id` or `kind:id:extra`
 */
import { buildLearnLessonPath, isUuid } from '@/lib/courses/course-slug'
import { NotificationKind } from '@/lib/notifications/types'
import { studioSectionPath } from '@/lib/instructor/studio/studio-paths'

export interface ResolveNotificationLinkOptions {
  /** Use admin-specific routes where applicable */
  isAdmin?: boolean
}

export function resolveNotificationLink(
  type: string,
  locale: string,
  options: ResolveNotificationLinkOptions = {}
): string | null {
  const [kind, id, extra] = type.split(':')
  const isAdmin = options.isAdmin ?? false

  if (isAdmin) {
    switch (kind) {
      case NotificationKind.courseReview:
        return `/${locale}/admin/courses?status=pending`
      case NotificationKind.instructorRequest:
      case NotificationKind.companyRequest:
      case NotificationKind.freelancerRequest:
        return `/${locale}/admin/role-requests`
      case NotificationKind.serviceOrderAdmin:
      case NotificationKind.serviceOrderCompleted:
        if (id) return `/${locale}/dashboard/orders/${id}`
        return `/${locale}/dashboard/orders/incoming?status=pending`
      case NotificationKind.importedJob:
        return `/${locale}/admin/jobs`
      case NotificationKind.newStudent:
        return `/${locale}/admin/courses`
      default:
        break
    }
  }

  switch (kind) {
    case NotificationKind.enrollment:
      if (id && extra) {
        if (isUuid(id) || isUuid(extra)) {
          return `/${locale}/dashboard/my-courses`
        }
        return buildLearnLessonPath(locale, id, extra)
      }
      return `/${locale}/dashboard/my-courses`
    case NotificationKind.newStudent:
      return `/${locale}/instructor/courses`
    case NotificationKind.instructorApproved:
      return `/${locale}/instructor`
    case NotificationKind.commissionUpdated:
      return `/${locale}/instructor/earnings`
    // Report BS-64: the ping must be answerable in ONE TAP — link straight to
    // the answer page instead of the generic notifications list.
    case NotificationKind.jobStatusCheck:
      return `/${locale}/dashboard/job-status`
    case NotificationKind.academyPaid:
      return `/${locale}/dashboard/academy`
    // Report BS-75: take the trainer to the course the decision was about.
    case NotificationKind.courseEditApproved:
    case NotificationKind.courseEditRejected:
      if (id) return `/${locale}/instructor/courses/${id}/studio/settings`
      return `/${locale}/instructor/courses`
    case NotificationKind.instructorRejected:
      return `/${locale}/dashboard`
    case NotificationKind.companyApproved:
      return `/${locale}/dashboard/company-jobs`
    case NotificationKind.companyRejected:
      return `/${locale}/dashboard/company-affiliation`
    case NotificationKind.courseApproved:
    case NotificationKind.courseRejected:
      if (id) return `/${locale}/courses/${id}`
      return `/${locale}/instructor/courses`
    case NotificationKind.courseEdit:
      if (id) return `/${locale}/instructor/courses/${id}/edit`
      return `/${locale}/instructor/courses`
    case NotificationKind.serviceOrderAdmin:
      return `/${locale}/admin/services`
    case NotificationKind.serviceOrderBuyer:
    case NotificationKind.serviceOrderAccepted:
    case NotificationKind.serviceOrderDelivered:
    case NotificationKind.serviceOrderCancelled:
      if (id) return `/${locale}/dashboard/orders/${id}`
      return `/${locale}/dashboard/orders/my-orders`
    case NotificationKind.serviceOrderSeller:
      if (id) return `/${locale}/dashboard/orders/${id}`
      return `/${locale}/dashboard/orders/incoming`
    case NotificationKind.serviceOrderCompleted:
      if (id) return `/${locale}/dashboard/orders/${id}`
      return `/${locale}/dashboard/orders/my-orders`
    case NotificationKind.courseReview:
      return `/${locale}/admin/courses?status=pending`
    case NotificationKind.instructorRequest:
      return `/${locale}/admin/instructor-requests`
    case NotificationKind.importedJob:
      return `/${locale}/admin/jobs`
    case NotificationKind.lessonQuestion:
      if (id && extra) {
        return `${studioSectionPath(locale, id, 'qa')}?thread=${encodeURIComponent(extra)}`
      }
      if (id) return studioSectionPath(locale, id, 'qa')
      return `/${locale}/instructor/courses`
    case NotificationKind.lessonAnswer:
      if (id && extra) {
        const threadId = type.split(':')[3]
        const base = buildLearnLessonPath(locale, id, extra)
        return threadId
          ? `${base}?tab=qa&thread=${encodeURIComponent(threadId)}`
          : `${base}?tab=qa`
      }
      return `/${locale}/dashboard/my-courses`
    default:
      return isAdmin
        ? `/${locale}/admin/notifications`
        : `/${locale}/dashboard/notifications`
  }
}

export function getNotificationIconKind(type: string): string {
  const kind = type.split(':')[0]
  const map: Record<string, string> = {
    [NotificationKind.enrollment]: 'book',
    [NotificationKind.newStudent]: 'users',
    [NotificationKind.instructorApproved]: 'graduation',
    [NotificationKind.instructorRejected]: 'alert',
    [NotificationKind.instructorRequest]: 'graduation',
    [NotificationKind.companyRequest]: 'briefcase',
    [NotificationKind.freelancerRequest]: 'shopping',
    [NotificationKind.companyApproved]: 'briefcase',
    [NotificationKind.companyRejected]: 'alert',
    [NotificationKind.courseApproved]: 'check',
    [NotificationKind.courseRejected]: 'x',
    [NotificationKind.courseReview]: 'book',
    [NotificationKind.courseEdit]: 'edit',
    [NotificationKind.serviceOrderAdmin]: 'briefcase',
    [NotificationKind.serviceOrderBuyer]: 'shopping',
    [NotificationKind.serviceOrderAccepted]: 'check',
    [NotificationKind.serviceOrderDelivered]: 'package',
    [NotificationKind.serviceOrderCompleted]: 'check',
    [NotificationKind.serviceOrderCancelled]: 'x',
    [NotificationKind.serviceOrderSeller]: 'inbox',
    [NotificationKind.commissionUpdated]: 'briefcase',
    [NotificationKind.jobStatusCheck]: 'briefcase',
    [NotificationKind.academyPaid]: 'check',
    [NotificationKind.courseEditApproved]: 'check',
    [NotificationKind.courseEditRejected]: 'x',
    [NotificationKind.lessonQuestion]: 'message',
    [NotificationKind.lessonAnswer]: 'message',
  }
  return map[kind] ?? 'bell'
}
