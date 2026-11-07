export type LessonQaThreadStatus = 'open' | 'answered'

export type LessonQaSenderRole = 'student' | 'instructor'

export interface LessonQaMessage {
  id: string
  thread_id: string
  sender_id: string
  sender_role: LessonQaSenderRole
  content: string
  created_at: string
}

export interface LessonQaThread {
  id: string
  lesson_id: string
  course_id: string
  student_id: string
  instructor_id: string
  status: LessonQaThreadStatus
  last_message_at: string
  created_at: string
}

export interface LessonQaThreadWithMessages extends LessonQaThread {
  messages: LessonQaMessage[]
}

export interface StudioLessonQaThreadRow {
  id: string
  status: LessonQaThreadStatus
  last_message_at: string
  created_at: string
  student: {
    id: string
    full_name: string
    full_name_ar?: string | null
    avatar_url?: string | null
  }
  lesson: {
    id: string
    title: string
    title_ar: string
    slug: string | null
    lesson_type: string | null
    section_title: string
    section_title_ar: string
  }
  messages: LessonQaMessage[]
  lastStudentMessage?: LessonQaMessage
}
