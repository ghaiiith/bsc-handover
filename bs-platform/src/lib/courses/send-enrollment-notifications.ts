import { getAppUrl } from '@/lib/seo/metadata'
import { getCourseEnrollmentContext } from '@/lib/courses/enrollment-notify'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import { notifyAndEmail } from '@/lib/notify'
import { buildPaymentConfirmationEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'

export async function sendEnrollmentNotifications(
  courseId: string,
  studentId: string,
  locale = 'ar'
): Promise<void> {
  const ctx = await getCourseEnrollmentContext(courseId)
  if (!ctx) return

  const { course, firstLesson } = ctx
  const appUrl = getAppUrl()
  const lessonPath =
    firstLesson
      ? buildLearnLessonPath(locale, course.slug, firstLesson.slug)
      : `/${locale}/dashboard/my-courses`

  const admin = createAdminClient()
  const { data: student } = await admin
    .from('users')
    .select('email, full_name')
    .eq('id', studentId)
    .single()

  const typeSuffix = firstLesson
    ? `${course.slug}:${firstLesson.slug}`
    : course.slug

  const studentTasks = notifyAndEmail(
    {
      userId: studentId,
      title: `Enrolled in ${course.title}`,
      titleAr: `تم تسجيلك في ${course.title_ar}`,
      body: `You are now enrolled in "${course.title}". Start learning!`,
      bodyAr: `تم تسجيلك في "${course.title_ar}". ابدأ التعلم الآن!`,
      type: `enrollment:${typeSuffix}`,
    },
    student?.email
      ? {
          to: student.email,
          ...buildPaymentConfirmationEmail({
            courseTitle: course.title_ar,
            thumbnailUrl: course.thumbnail_url,
            lessonUrl: `${appUrl}${lessonPath}`,
            locale,
          }),
        }
      : null
  )

  const instructorTasks = course.instructor_id
    ? notifyAndEmail({
        userId: course.instructor_id,
        title: 'New student enrolled',
        titleAr: 'طالب جديد انضم لكورسك',
        body: `A new student joined your course "${course.title}".`,
        bodyAr: `طالب جديد انضم لكورسك "${course.title_ar}".`,
        type: `new_student:${courseId}`,
      })
    : Promise.resolve()

  await Promise.allSettled([studentTasks, instructorTasks])
}
