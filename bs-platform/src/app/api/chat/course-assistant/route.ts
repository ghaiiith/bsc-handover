import { NextResponse } from 'next/server'
import { callClaudeChat, isAnthropicConfigured } from '@/lib/chat/anthropic-client'
import { answerViaLearningAssistant } from '@/lib/chat/assistant-fallback'
import { buildCourseSystemPrompt } from '@/lib/chat/buildCourseSystemPrompt'
import {
  courseAssistantSchema,
  MAX_USER_MESSAGE_LENGTH,
} from '@/lib/chat/course-assistant-schemas'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'
import { requireAiAccess } from '@/lib/auth/require-ai-access'
import { chatUiMessage, resolveChatLocale } from '@/lib/chat/chat-schemas'
import { fetchCourseAssistantContext } from '@/lib/chat/fetch-course-assistant-context'

export async function POST(request: Request) {
  const locale = resolveChatLocale(request)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = courseAssistantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { messages, courseId, lessonId } = parsed.data

  const aiAccess = await requireAiAccess('chat')
  if (!aiAccess.ok) {
    if (aiAccess.reason === 'unauthorized') {
      return NextResponse.json(
        { error: 'unauthorized', message: chatUiMessage('course_unauthorized', locale) },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'forbidden', message: chatUiMessage('ai_access_forbidden', locale) },
      { status: 403 }
    )
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUserMessage) {
    return NextResponse.json({ error: 'no_user_message' }, { status: 400 })
  }

  if (lastUserMessage.content.length > MAX_USER_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: 'message_too_long', message: chatUiMessage('message_too_long', locale) },
      { status: 400 }
    )
  }

  const fetchResult = await fetchCourseAssistantContext(courseId, lessonId)
  if (!fetchResult.ok) {
    if (fetchResult.reason === 'unauthenticated') {
      return NextResponse.json(
        { error: 'unauthorized', message: chatUiMessage('course_unauthorized', locale) },
        { status: 401 }
      )
    }
    if (fetchResult.reason === 'forbidden') {
      return NextResponse.json(
        { error: 'forbidden', message: chatUiMessage('course_forbidden', locale) },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { context, access } = fetchResult

  const rateCheck = await checkDurableRateLimit({
    key: `chat:course:${access.userId}:${courseId}`,
    max: 15,
    windowSeconds: 3600,
  })
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: chatUiMessage('rate_limited', locale) },
      { status: 429 }
    )
  }

  const systemPrompt = buildCourseSystemPrompt({
    context,
    userRole: aiAccess.role,
    isEnrolled: access.isEnrolled,
  })

  // Same two-provider order as /api/chat/general: Anthropic when a key exists,
  // otherwise the configured learning_assistant service.
  if (isAnthropicConfigured()) {
    const result = await callClaudeChat(systemPrompt, messages, 600)

    if (result.ok) {
      return NextResponse.json({ reply: result.reply })
    }
    if (result.status === 429) {
      return NextResponse.json(
        { error: 'rate_limited', message: chatUiMessage('rate_limited', locale) },
        { status: 429 }
      )
    }
  }

  const assisted = await answerViaLearningAssistant({
    messages,
    pageContext: locale === 'ar' ? context.title_ar || context.title : context.title,
    locale,
    userId: access.userId,
    role: aiAccess.role,
  })
  if (assisted) return NextResponse.json({ reply: assisted })

  return NextResponse.json({ reply: chatUiMessage('fallback_error', locale) })
}
