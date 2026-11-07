import { z } from 'zod'

export const MAX_CHAT_MESSAGES = 20
export const MAX_USER_MESSAGE_LENGTH = 1000

export const FALLBACK_ERROR_AR =
  'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.'
export const RATE_LIMIT_MESSAGE_AR = 'أرسلت رسائل كثيرة. يرجى الانتظار قليلاً.'
export const UNAUTHORIZED_MESSAGE_AR = 'يرجى تسجيل الدخول لاستخدام المساعد الذكي.'
export const AI_ACCESS_FORBIDDEN_AR =
  'المساعد الذكي متاح لممثلي الشركات والمدربين والإداريين فقط.'
export const MESSAGE_TOO_LONG_AR = 'رسالتك طويلة جداً. يرجى اختصارها.'

export type ChatLocale = 'ar' | 'en'
export type ChatUiMessageKey =
  | 'fallback_error'
  | 'rate_limited'
  | 'unauthorized'
  | 'ai_access_forbidden'
  | 'message_too_long'
  | 'course_unauthorized'
  | 'course_forbidden'

const CHAT_UI_MESSAGES: Record<ChatUiMessageKey, Record<ChatLocale, string>> = {
  fallback_error: {
    ar: FALLBACK_ERROR_AR,
    en: 'Sorry, something went wrong. Please try again or contact support.',
  },
  rate_limited: {
    ar: RATE_LIMIT_MESSAGE_AR,
    en: 'You have sent too many messages. Please wait a moment.',
  },
  unauthorized: {
    ar: UNAUTHORIZED_MESSAGE_AR,
    en: 'Please log in to use the AI assistant.',
  },
  ai_access_forbidden: {
    ar: AI_ACCESS_FORBIDDEN_AR,
    en: 'The AI assistant is available to company representatives, instructors, and admins only.',
  },
  message_too_long: {
    ar: MESSAGE_TOO_LONG_AR,
    en: 'Your message is too long. Please shorten it.',
  },
  course_unauthorized: {
    ar: 'يرجى تسجيل الدخول لاستخدام مساعد الكورس.',
    en: 'Please log in to use the course assistant.',
  },
  course_forbidden: {
    ar: 'يجب أن تكون مسجلاً في هذا الكورس لاستخدام المساعد أثناء مشاهدة الدروس.',
    en: 'You must be enrolled in this course to use the assistant while watching lessons.',
  },
}

export function chatUiMessage(key: ChatUiMessageKey, locale: ChatLocale): string {
  return CHAT_UI_MESSAGES[key][locale]
}

/** Locale of the page the chat request came from (NEXT_LOCALE cookie, then referer path). */
export function resolveChatLocale(request: Request): ChatLocale {
  const cookie = request.headers.get('cookie') ?? ''
  const m = cookie.match(/NEXT_LOCALE=(ar|en)/)
  if (m) return m[1] as ChatLocale
  try {
    const referer = request.headers.get('referer')
    if (referer && new URL(referer).pathname.match(/^\/en(\/|$)/)) return 'en'
  } catch {
    // unparsable referer — fall through to default
  }
  return 'ar'
}

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
})

export const generalChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(MAX_CHAT_MESSAGES),
  pageContext: z.string().max(500).default('/'),
  userRole: z.enum(['student', 'instructor', 'admin', 'company', 'freelancer']).nullable().default(null),
})

export type GeneralChatBody = z.infer<typeof generalChatSchema>
