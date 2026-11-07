import 'server-only'

import type { ChatMessage } from '@/types/chat'
import type { ChatLocale } from '@/lib/chat/chat-schemas'
import {
  assistantChat,
  isLearningAssistantConfigured,
} from '@/lib/ai/learning-assistant-server'
import {
  buildAssistantStudent,
  getAssistantCatalog,
  getAssistantJobs,
} from '@/lib/ai/learning-assistant-data'
import { applyRoleBrief, buildRoleWorkspace } from '@/lib/chat/role-workspace'
import type { ChatUserRole } from '@/types/chat'

/**
 * Second provider for the floating platform chatbot.
 *
 * The widget was built against the Anthropic API, but production never had an
 * ANTHROPIC_API_KEY, so every message came back as the generic error bubble.
 * The learning_assistant microservice IS configured and answers the same kind
 * of question, so we route to it whenever Anthropic is unavailable. Anthropic
 * stays the preferred provider if a key is ever added.
 */

/** Split the widget's rolling transcript into the LA service's message+history shape. */
export function splitTranscript(messages: ChatMessage[]): {
  message: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
} | null {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user')
  if (lastUserIndex === -1) return null

  const message = messages[lastUserIndex].content
  const history = messages
    .slice(0, lastUserIndex)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  return { message, history }
}

/** Append the assistant's course/job picks so its recommendations stay actionable. */
export function appendSuggestions(
  answer: string,
  courses: Array<{ title: string }>,
  jobs: Array<{ title: string; company?: string | null }>,
  locale: ChatLocale
): string {
  const parts = [answer.trim()]

  if (courses.length > 0) {
    const heading = locale === 'ar' ? 'كورسات مقترحة:' : 'Suggested courses:'
    parts.push(`${heading}\n${courses.slice(0, 3).map((c) => `• ${c.title}`).join('\n')}`)
  }
  if (jobs.length > 0) {
    const heading = locale === 'ar' ? 'وظائف مقترحة:' : 'Suggested jobs:'
    parts.push(
      `${heading}\n${jobs
        .slice(0, 3)
        .map((j) => `• ${j.title}${j.company ? ` — ${j.company}` : ''}`)
        .join('\n')}`
    )
  }

  return parts.join('\n\n')
}

/**
 * Answer a platform-chat turn through the learning_assistant service.
 * Returns null when the service is unconfigured or unreachable, so the caller
 * can still show its own error copy.
 */
export async function answerViaLearningAssistant(input: {
  messages: ChatMessage[]
  pageContext: string
  locale: ChatLocale
  userId: string
  /** BS-95/96: without this every role got the student assistant. */
  role?: ChatUserRole
}): Promise<string | null> {
  if (!isLearningAssistantConfigured()) {
    console.error('[chat-fallback] learning assistant not configured')
    return null
  }

  const split = splitTranscript(input.messages)
  if (!split) {
    console.error('[chat-fallback] transcript had no user turn')
    return null
  }

  // BS-95/96: an instructor or company gets their own workspace brief, and the
  // student catalog/job board are withheld so the service cannot answer with
  // "here are courses to take".
  const workspace = await buildRoleWorkspace(input.userId, input.role ?? null, input.locale)

  // Grounding data is best-effort: a failed lookup must not lose the reply.
  const [student, catalog, jobs] = workspace.includeStudentContext
    ? await Promise.all([
        buildAssistantStudent(input.userId).catch(() => undefined),
        getAssistantCatalog(input.locale).catch(() => []),
        getAssistantJobs(input.locale).catch(() => []),
      ])
    : [undefined, [], []]

  const result = await assistantChat({
    message: applyRoleBrief(split.message, workspace.brief),
    history: split.history,
    student,
    catalog,
    jobs,
    page: { path: input.pageContext },
    locale: input.locale,
  })

  if (!result?.ok || !result.answer?.trim()) {
    console.error(
      '[chat-fallback] assistant returned no answer',
      JSON.stringify({ reached: Boolean(result), ok: result?.ok })
    )
    return null
  }

  // Only a student sees "suggested courses / jobs" under the answer.
  if (!workspace.includeStudentContext) return result.answer.trim()

  return appendSuggestions(
    result.answer,
    result.recommended_courses ?? [],
    result.recommended_jobs ?? [],
    input.locale
  )
}
