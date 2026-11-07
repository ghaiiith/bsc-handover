import { revalidatePath } from 'next/cache'
import { revalidateCoursesListingCache } from '@/lib/cache/invalidate-listing-cache'

/** Revalidate instructor studio, course list, and public course pages after edits. */
export function revalidateCourseStudioPaths(courseId: string, locale: string) {
  revalidateCoursesListingCache()
  revalidatePath(`/${locale}/instructor/courses`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/edit`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio`, 'layout')
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/information`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/curriculum`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/resources`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/students`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/reviews`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/analytics`)
  revalidatePath(`/${locale}/instructor/courses/${courseId}/studio/settings`)
  revalidatePath(`/${locale}/courses/${courseId}`)
  revalidatePath(`/${locale}/courses`)
}
