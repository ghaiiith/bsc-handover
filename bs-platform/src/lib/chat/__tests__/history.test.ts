import { describe, it, expect } from 'vitest'
import { sanitizeHistory, MAX_CONTENT_LENGTH } from '@/lib/chat/history'
import { MAX_CHAT_MESSAGES } from '@/lib/chat/chat-schemas'

describe('sanitizeHistory', () => {
  it('keeps well-formed user and assistant turns unchanged', () => {
    const input = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]
    expect(sanitizeHistory(input)).toEqual(input)
  })

  it('drops roles the API does not accept', () => {
    const out = sanitizeHistory([
      { role: 'system', content: 'you are a bot' },
      { role: 'user', content: 'hi' },
    ])
    expect(out).toEqual([{ role: 'user', content: 'hi' }])
  })

  it('drops empty and whitespace-only content', () => {
    const out = sanitizeHistory([
      { role: 'user', content: '' },
      { role: 'assistant', content: '   ' },
      { role: 'user', content: 'real' },
    ])
    expect(out).toEqual([{ role: 'user', content: 'real' }])
  })

  it('drops entries that are not objects', () => {
    const out = sanitizeHistory([null, undefined, 'hi', 42, { role: 'user', content: 'ok' }])
    expect(out).toEqual([{ role: 'user', content: 'ok' }])
  })

  it('drops entries whose content is not a string', () => {
    const out = sanitizeHistory([
      { role: 'user', content: { text: 'nested' } },
      { role: 'user', content: 'ok' },
    ])
    expect(out).toEqual([{ role: 'user', content: 'ok' }])
  })

  it('truncates over-long content instead of dropping the turn', () => {
    const out = sanitizeHistory([{ role: 'user', content: 'x'.repeat(MAX_CONTENT_LENGTH + 500) }])
    expect(out).toHaveLength(1)
    expect(out[0].content.length).toBe(MAX_CONTENT_LENGTH)
  })

  it('caps the transcript at the API message limit, keeping the newest', () => {
    const many = Array.from({ length: MAX_CHAT_MESSAGES + 10 }, (_, i) => ({
      role: 'user' as const,
      content: `m${i}`,
    }))
    const out = sanitizeHistory(many)
    expect(out).toHaveLength(MAX_CHAT_MESSAGES)
    expect(out[out.length - 1].content).toBe(`m${MAX_CHAT_MESSAGES + 9}`)
  })

  it('returns an empty array for non-array input', () => {
    expect(sanitizeHistory(null)).toEqual([])
    expect(sanitizeHistory({ role: 'user', content: 'hi' })).toEqual([])
    expect(sanitizeHistory('hi')).toEqual([])
  })

  it('recovers a usable transcript from a poisoned one', () => {
    const out = sanitizeHistory([
      { role: 'assistant', content: '' },
      { role: 'bogus', content: 'x' },
      { role: 'user', content: 'شنو أتعلم؟' },
    ])
    expect(out).toEqual([{ role: 'user', content: 'شنو أتعلم؟' }])
  })
})
