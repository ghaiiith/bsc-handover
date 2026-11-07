import type { Course, CourseSection, Lesson, Review, User } from '@/types'

/** Synthetic section id for lessons missing a `section_id` assignment. */
export const UNCATEGORIZED_SECTION_ID = 'uncategorized-lessons'

export interface CourseSectionWithLessons extends CourseSection {
  lessons: Lesson[]
}

export interface ReviewWithReviewer extends Omit<Review, 'reviewer'> {
  reviewer?: Pick<User, 'id' | 'full_name' | 'full_name_ar' | 'avatar_url'>
}

export interface RatingBreakdown {
  stars: Record<1 | 2 | 3 | 4 | 5, number>
  percentages: Record<1 | 2 | 3 | 4 | 5, number>
}

export interface CourseDetailData {
  course: Course
  instructor: User
  sections: CourseSectionWithLessons[]
  reviews: ReviewWithReviewer[]
  avgRating: number
  reviewCount: number
  enrollmentCount: number
  ratingBreakdown: RatingBreakdown
  isEnrolled: boolean
  isInstructor: boolean
  isAdmin: boolean
  isWishlisted: boolean
  hasReviewed: boolean
  userId?: string
  firstLessonId?: string
  firstLessonSlug?: string
  /** Whether the course has a preview trailer (signed URL fetched client-side). */
  hasPreviewVideo: boolean
  /** Lessons + duration derived from the curriculum tree (single source of truth for UI). */
  curriculumLessonCount: number
  curriculumDurationMinutes: number
}
