import type { ChatMessage, ChatUserRole } from '@/types/chat'

export interface CourseAssistantLessonContext {
  id: string
  title: string
  title_ar: string
  description?: string
  description_ar?: string
  duration_minutes: number
  is_free_preview: boolean
  quiz_question_titles: string[]
}

export interface CourseAssistantSectionContext {
  title: string
  title_ar: string
  lessons: CourseAssistantLessonContext[]
}

export interface CourseAssistantContext {
  courseId: string
  title: string
  title_ar: string
  description?: string
  description_ar?: string
  category: string
  level: string
  language: string
  learning_outcomes: string[]
  instructor: {
    full_name: string
    full_name_ar?: string
    bio?: string
    bio_ar?: string
  }
  sections: CourseAssistantSectionContext[]
  avg_rating: number
  enrollment_count: number
  currentLesson?: CourseAssistantLessonContext
}

export interface CourseAssistantRequest {
  messages: ChatMessage[]
  courseId: string
  lessonId?: string
  userRole: ChatUserRole
}

export interface CourseAssistantResponse {
  reply: string
}
