import type { ChatMessage } from '@/types/chat'
import { MAX_CHAT_MESSAGES } from '@/lib/chat/chat-schemas'

/** Must stay <= chatMessageSchema's per-message content cap. */
export const MAX_CONTENT_LENGTH = 4000

/**
 * Drop anything the chat API would reject.
 *
 * The widget keeps its transcript in sessionStorage and replays it on every
 * turn. One malformed entry (wrong role, empty string, over-long content) made
 * the whole request fail validation from then on, so the assistant looked
 * permanently broken for that one person while working for everybody else.
 * Sanitising on both load and send makes a poisoned transcript self-healing.
 */
export function sanitizeHistory(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return []

  return messages
    .filter((m): m is ChatMessage => {
      if (!m || typeof m !== 'object') return false
      const msg = m as ChatMessage
      if (msg.role !== 'user' && msg.role !== 'assistant') return false
      return typeof msg.content === 'string' && msg.content.trim().length > 0
    })
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) }))
    .slice(-MAX_CHAT_MESSAGES)
}
