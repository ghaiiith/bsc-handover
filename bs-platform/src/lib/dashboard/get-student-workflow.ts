import { getMyEnrollments } from '@/lib/courses/get-my-enrollments'
import { getUnreadNotificationCount } from '@/lib/notifications/get-notifications-page'
import { getStudentCertificates } from '@/lib/certificates/get-certificates'

export interface StudentWorkflowData {
  continueCourse: {
    courseTitle: string
    courseSlug: string
    thumbnailUrl: string | null
    progressPercent: number
    completedLessons: number
    totalLessons: number
    continueLessonSlug?: string
  } | null
  recentCourses: Array<{
    id: string
    title: string
    slug: string
    progressPercent: number
    href: string
  }>
  unreadNotifications: number
  certificateCount: number
  hasEnrollments: boolean
}

export async function getStudentWorkflowData(
  userId: string,
  locale: string
): Promise<StudentWorkflowData> {
  const [enrollments, unreadNotifications, certificates] = await Promise.all([
    getMyEnrollments(userId),
    getUnreadNotificationCount(userId),
    getStudentCertificates(userId),
  ])

  const isAr = locale === 'ar'
  const inProgress = enrollments.filter((e) => !e.isComplete)
  const sorted = [...inProgress].sort((a, b) => b.progressPercent - a.progressPercent)
  const primary = sorted[0] ?? enrollments[0]

  const continueCourse = primary
    ? {
        courseTitle: isAr ? primary.course.title_ar : primary.course.title,
        courseSlug: primary.course.slug,
        thumbnailUrl: primary.course.thumbnail_url ?? null,
        progressPercent: primary.progressPercent,
        completedLessons: primary.completedLessons,
        totalLessons: primary.totalLessons,
        continueLessonSlug: primary.continueLessonSlug,
      }
    : null

  const recentCourses = enrollments.slice(0, 3).map((e) => ({
    id: e.course.id,
    title: isAr ? e.course.title_ar : e.course.title,
    slug: e.course.slug,
    progressPercent: e.progressPercent,
    href: e.continueLessonSlug
      ? `/${locale}/learn/${e.course.slug}/${e.continueLessonSlug}`
      : `/${locale}/courses/${e.course.slug}`,
  }))

  return {
    continueCourse,
    recentCourses,
    unreadNotifications,
    certificateCount: certificates.length,
    hasEnrollments: enrollments.length > 0,
  }
}
