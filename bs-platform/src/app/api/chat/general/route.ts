import { NextResponse } from 'next/server'
import { callClaudeChat, isAnthropicConfigured } from '@/lib/chat/anthropic-client'
import { answerViaLearningAssistant } from '@/lib/chat/assistant-fallback'
import { buildSystemPrompt } from '@/lib/chat/buildSystemPrompt'
import {
  chatUiMessage,
  generalChatSchema,
  MAX_USER_MESSAGE_LENGTH,
  resolveChatLocale,
} from '@/lib/chat/chat-schemas'
import { requireAiAccess } from '@/lib/auth/require-ai-access'
import { checkDurableRateLimit } from '@/lib/rate-limit/durable'

export async function POST(request: Request) {
  const locale = resolveChatLocale(request)
  const aiAccess = await requireAiAccess('chat')
  if (!aiAccess.ok) {
    if (aiAccess.reason === 'unauthorized') {
      return NextResponse.json(
        { error: 'unauthorized', message: chatUiMessage('unauthorized', locale) },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'forbidden', message: chatUiMessage('ai_access_forbidden', locale) },
      { status: 403 }
    )
  }

  const userId = aiAccess.userId

  const rateCheck = await checkDurableRateLimit({
    key: `chat:general:user:${userId}`,
    max: 10,
    windowSeconds: 60,
  })
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: chatUiMessage('rate_limited', locale) },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = generalChatSchema.safeParse(body)
  if (!parsed.success) {
    // Logged with the user id: a client sending a malformed transcript used to
    // be indistinguishable from "the AI is down" in every bug report.
    console.error(
      '[chat/general] validation_failed',
      JSON.stringify({ userId, issues: parsed.error.issues.slice(0, 5) })
    )
    return NextResponse.json(
      { error: 'validation_failed', message: chatUiMessage('fallback_error', locale) },
      { status: 400 }
    )
  }

  const { messages, pageContext } = parsed.data

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

  // Anthropic is preferred, but production has no ANTHROPIC_API_KEY — without a
  // second provider every message rendered as the generic error bubble. Fall
  // back to the learning_assistant service, which is configured and answers the
  // same platform questions.
  if (isAnthropicConfigured()) {
    const systemPrompt = buildSystemPrompt({ pageContext, userRole: aiAccess.role })
    const result = await callClaudeChat(systemPrompt, messages)

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
    pageContext,
    locale,
    userId,
    role: aiAccess.role,
  })
  if (assisted) return NextResponse.json({ reply: assisted })

  console.error(
    '[chat/general] no_provider_answered',
    JSON.stringify({ userId, anthropic: isAnthropicConfigured(), turns: messages.length })
  )
  // No `reply` here on purpose: the widget then shows its "try again in a
  // minute" copy instead of a generic error.
  return NextResponse.json(
    { error: 'assistant_unavailable', message: chatUiMessage('fallback_error', locale) },
    { status: 503 }
  )
}
