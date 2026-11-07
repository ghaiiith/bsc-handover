import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { countCurriculumLessons, sumCurriculumDurationMinutes } from '@/lib/courses/format-duration'
import { syncCourseLessonStats } from '@/lib/studio/sync-course-stats'
import { getVideoAssetById } from '@/lib/video/video-asset-service'
import { countEnrollmentsForCourse } from '@/lib/courses/enrollment-count'
import {
  UNCATEGORIZED_SECTION_ID,
  type CourseDetailData,
  type CourseSectionWithLessons,
  type RatingBreakdown,
  type ReviewWithReviewer,
} from '@/types/course-detail'
import type { Course, CourseSection, Lesson, User, UserRole } from '@/types'
import { stripTrainerOnlyFields } from '@/lib/courses/strip-trainer-only-fields'

export type {
  CourseDetailData,
  CourseSectionWithLessons,
  RatingBreakdown,
  ReviewWithReviewer,
} from '@/types/course-detail'
export { UNCATEGORIZED_SECTION_ID } from '@/types/course-detail'

function computeRatingStats(reviews: ReviewWithReviewer[]) {
  const stars: RatingBreakdown['stars'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach((review) => {
    const rating = review.rating as 1 | 2 | 3 | 4 | 5
    if (rating >= 1 && rating <= 5) {
      stars[rating] += 1
    }
  })

  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0

  const percentages: RatingBreakdown['percentages'] = {
    1: reviewCount ? Math.round((stars[1] / reviewCount) * 100) : 0,
    2: reviewCount ? Math.round((stars[2] / reviewCount) * 100) : 0,
    3: reviewCount ? Math.round((stars[3] / reviewCount) * 100) : 0,
    4: reviewCount ? Math.round((stars[4] / reviewCount) * 100) : 0,
    5: reviewCount ? Math.round((stars[5] / reviewCount) * 100) : 0,
  }

  return { avgRating, reviewCount, ratingBreakdown: { stars, percentages } }
}

function sanitizeLessonForViewer(
  lesson: Lesson,
  canAccessContent: boolean
): Lesson {
  if (canAccessContent) return stripTrainerOnlyFields(lesson)
  return {
    ...stripTrainerOnlyFields(lesson),
    video_url: undefined,
    video_asset_id: null,
    attachment_url: undefined,
    content_html: undefined,
    external_url: undefined,
  }
}

function getFirstLessonRef(
  sections: CourseSectionWithLessons[]
): { id: string; slug: string } | undefined {
  for (const section of sections) {
    const lesson = section.lessons[0]
    if (lesson) {
      return { id: lesson.id, slug: lesson.slug }
    }
  }
  return undefined
}

async function attachLessonsToSections(
  courseId: string,
  canAccessLessonContent: (lesson: Lesson) => boolean
): Promise<CourseSectionWithLessons[]> {
  const admin = createAdminClient()

  const { data: sectionRows } = await admin
    .from('course_sections')
    .select('id, course_id, title, title_ar, order_index')
    .eq('course_id', courseId)
    .order('order_index')

  const { data: lessonRows } = await admin
    .from('lessons')
    .select(
      'id, section_id, course_id, slug, title, title_ar, video_asset_id, duration_minutes, order_index, is_free_preview, lesson_type, attachment_url, content_html, external_url'
    )
    .eq('course_id', courseId)
    .order('order_index')

  const lessons = (lessonRows ?? []) as Lesson[]
  const sections = (sectionRows ?? []) as CourseSection[]

  const mapped = sections.map((section) => ({
    ...section,
    lessons: lessons
      .filter((lesson) => lesson.section_id === section.id)
      .map((lesson) =>
        sanitizeLessonForViewer(lesson, canAccessLessonContent(lesson))
      )
      .sort((a, b) => a.order_index - b.order_index),
  }))

  const assignedIds = new Set(
    mapped.flatMap((section) => section.lessons.map((lesson) => lesson.id))
  )
  const orphanLessons = lessons.filter((lesson) => !assignedIds.has(lesson.id))

  if (orphanLessons.length > 0) {
    mapped.push({
      id: UNCATEGORIZED_SECTION_ID,
      course_id: courseId,
      title: 'Additional lessons',
      title_ar: 'دروس إضافية',
      order_index: 9_999,
      lessons: orphanLessons
        .map((lesson) =>
          sanitizeLessonForViewer(lesson, canAccessLessonContent(lesson))
        )
        .sort((a, b) => a.order_index - b.order_index),
    })
  }

  return mapped.sort((a, b) => a.order_index - b.order_index)
}

export async function getCourseDetail(
  courseId: string
): Promise<CourseDetailData | null> {
  const supabase = await createClient()

  const { data: courseRow, error } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:users(id, full_name, full_name_ar, avatar_url, role, bio, bio_ar, is_active, created_at)
    `)
    .eq('id', courseId)
    .single()

  if (error || !courseRow) {
    return null
  }

  const {
    instructor: instructorRaw,
    ...courseData
  } = courseRow as Course & {
    instructor: User | null
  }

  if (!instructorRaw) {
    return null
  }

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id

  let userRole: UserRole | undefined
  if (userId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    userRole = profile?.role as UserRole | undefined
  }

  const isInstructor = userId === courseData.instructor_id
  const isAdmin = userRole === 'admin'
  const isPublished = courseData.status === 'published'

  if (!isPublished && !isInstructor && !isAdmin) {
    return null
  }

  let isEnrolled = false
  let isWishlisted = false
  let hasReviewed = false
  if (userId) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()
    isEnrolled = Boolean(enrollment)

    const { data: wishlistRow } = await supabase
      .from('course_wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()
    isWishlisted = Boolean(wishlistRow)

    const { data: userReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', userId)
      .eq('target_type', 'course')
      .eq('target_id', courseId)
      .maybeSingle()
    hasReviewed = Boolean(userReview)
  }

  const { data: reviewsData } = await supabase
    .from('reviews')
    .select(`
      id, reviewer_id, target_type, target_id, rating, comment, created_at,
      reviewer:users(id, full_name, full_name_ar, avatar_url)
    `)
    .eq('target_type', 'course')
    .eq('target_id', courseId)
    .order('created_at', { ascending: false })

  const reviewsRaw = reviewsData ?? []
  const reviews: ReviewWithReviewer[] = reviewsRaw.map((row) => {
    const reviewerData = row.reviewer
    const reviewer = Array.isArray(reviewerData) ? reviewerData[0] : reviewerData
    return {
      id: row.id,
      reviewer_id: row.reviewer_id,
      target_type: row.target_type,
      target_id: row.target_id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
      reviewer: reviewer ?? undefined,
    }
  })
  const canAccessLessonContent = (lesson: Lesson) =>
    Boolean(
      lesson.is_free_preview || isEnrolled || isInstructor || isAdmin
    )
  const sections = await attachLessonsToSections(courseId, canAccessLessonContent)
  const curriculumLessonCount = countCurriculumLessons(sections)
  const curriculumDurationMinutes = sumCurriculumDurationMinutes(sections)

  if (
    curriculumLessonCount !== (courseData.total_lessons ?? 0) ||
    curriculumDurationMinutes !== (courseData.total_duration_minutes ?? 0)
  ) {
    void syncCourseLessonStats(courseId)
  }
  const { avgRating, reviewCount, ratingBreakdown } = computeRatingStats(reviews)
  const enrollmentCount = await countEnrollmentsForCourse(courseId)
  const firstLesson = getFirstLessonRef(sections)

  let hasPreviewVideo = false
  if (courseData.preview_video_asset_id) {
    const previewAsset = await getVideoAssetById(courseData.preview_video_asset_id)
    hasPreviewVideo = previewAsset?.status === 'ready'
  }

  return {
    course: courseData,
    instructor: instructorRaw,
    sections,
    reviews,
    avgRating,
    reviewCount,
    enrollmentCount,
    ratingBreakdown,
    isEnrolled,
    isInstructor,
    isAdmin,
    isWishlisted,
    hasReviewed,
    userId,
    firstLessonId: firstLesson?.id,
    firstLessonSlug: firstLesson?.slug,
    hasPreviewVideo,
    curriculumLessonCount,
    curriculumDurationMinutes,
  }
}

export function canAccessLesson(
  lesson: Lesson,
  context: Pick<CourseDetailData, 'isEnrolled' | 'isInstructor' | 'isAdmin'>
): boolean {
  return (
    lesson.is_free_preview ||
    context.isEnrolled ||
    context.isInstructor ||
    context.isAdmin
  )
}

export function splitLearningOutcomes(description: string): string[] {
  const lines = description
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length > 1) {
    return lines.map((line) => line.replace(/^[-•*]\s*/, ''))
  }

  return description
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .slice(0, 6)
}
