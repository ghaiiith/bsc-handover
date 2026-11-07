/** Colon-delimited notification type strings: `kind` or `kind:id` or `kind:id:extra */

export const NotificationKind = {
  enrollment: 'enrollment',
  newStudent: 'new_student',
  instructorApproved: 'instructor_approved',
  instructorRejected: 'instructor_rejected',
  instructorRequest: 'instructor_request',
  courseApproved: 'course_approved',
  courseRejected: 'course_rejected',
  courseReview: 'course_review',
  courseEdit: 'course_edit',
  serviceOrderBuyer: 'service_order_buyer',
  serviceOrderSeller: 'service_order_seller',
  serviceOrderAdmin: 'service_order_admin',
  serviceOrderAccepted: 'service_order_accepted',
  serviceOrderDelivered: 'service_order_delivered',
  serviceOrderCompleted: 'service_order_completed',
  serviceOrderCancelled: 'service_order_cancelled',
  serviceApproved: 'service_approved',
  serviceRejected: 'service_rejected',
  importedJob: 'imported_job',
  jobExpired: 'job_expired',
  commissionUpdated: 'commission_updated',
  lessonQuestion: 'lesson_question',
  lessonAnswer: 'lesson_answer',
  companyRequest: 'company_request',
  companyApproved: 'company_approved',
  companyRejected: 'company_rejected',
  freelancerRequest: 'freelancer_request',
  freelancerApproved: 'freelancer_approved',
  freelancerRejected: 'freelancer_rejected',
  /** Report BS-64: monthly "did you find a job?" ping. */
  jobStatusCheck: 'job_status_check',
  /** Report BS-70/80: Company Academy bulk seat purchase. */
  academyPaid: 'academy_paid',
  /** Report BS-75: decision on a trainer's pending course edit. */
  courseEditApproved: 'course_edit_approved',
  courseEditRejected: 'course_edit_rejected',
} as const

export type NotificationKindValue =
  (typeof NotificationKind)[keyof typeof NotificationKind]

export function buildNotificationType(
  kind: NotificationKindValue,
  ...parts: (string | undefined)[]
): string {
  return [kind, ...parts.filter(Boolean)].join(':')
}

export interface NotificationRecord {
  id: string
  title: string
  title_ar: string
  body: string
  body_ar: string
  type: string
  is_read: boolean
  created_at: string
}
