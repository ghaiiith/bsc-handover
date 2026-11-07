import { z } from 'zod'
import {
  FALLBACK_ERROR_AR,
  MAX_CHAT_MESSAGES,
  MAX_USER_MESSAGE_LENGTH,
  MESSAGE_TOO_LONG_AR,
  RATE_LIMIT_MESSAGE_AR,
} from '@/lib/chat/chat-schemas'

export {
  FALLBACK_ERROR_AR,
  MAX_CHAT_MESSAGES,
  MAX_USER_MESSAGE_LENGTH,
  MESSAGE_TOO_LONG_AR,
  RATE_LIMIT_MESSAGE_AR,
}

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
})

export const courseAssistantSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(MAX_CHAT_MESSAGES),
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
  userRole: z.enum(['student', 'instructor', 'admin', 'company', 'freelancer']).nullable().default(null),
})

export type CourseAssistantBody = z.infer<typeof courseAssistantSchema>

export const COURSE_ASSISTANT_FORBIDDEN_AR =
  'يجب أن تكون مسجلاً في هذا الكورس لاستخدام المساعد أثناء مشاهدة الدروس.'

export const COURSE_ASSISTANT_UNAUTHORIZED_AR =
  'يرجى تسجيل الدخول لاستخدام مساعد الكورس.'
