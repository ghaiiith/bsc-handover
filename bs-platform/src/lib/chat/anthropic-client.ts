import 'server-only'

import type { ChatMessage } from '@/types/chat'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
const TIMEOUT_MS = 30_000

interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[]
  error?: { type: string; message: string }
}

export function isAnthropicConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  return Boolean(key && !key.startsWith('your_'))
}

export async function callClaudeChat(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens = 500
): Promise<{ ok: true; reply: string } | { ok: false; status: number; message: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, status: 503, message: 'api_not_configured' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: controller.signal,
    })

    if (response.status === 429) {
      return { ok: false, status: 429, message: 'rate_limited' }
    }

    if (!response.ok) {
      return { ok: false, status: response.status, message: 'api_error' }
    }

    const data = (await response.json()) as AnthropicResponse
    const text = data.content?.find((b) => b.type === 'text')?.text?.trim()

    if (!text) {
      return { ok: false, status: 502, message: 'empty_response' }
    }

    return { ok: true, reply: text }
  } catch {
    return { ok: false, status: 502, message: 'network_error' }
  } finally {
    clearTimeout(timeout)
  }
}
