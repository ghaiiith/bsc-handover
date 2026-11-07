import { describe, it, expect } from 'vitest'
import { splitTranscript, appendSuggestions } from '@/lib/chat/assistant-fallback'
import type { ChatMessage } from '@/types/chat'

const msg = (role: ChatMessage['role'], content: string) => ({ role, content }) as ChatMessage

describe('splitTranscript', () => {
  it('takes the last user turn as the message', () => {
    const out = splitTranscript([
      msg('user', 'first'),
      msg('assistant', 'reply'),
      msg('user', 'second'),
    ])
    expect(out?.message).toBe('second')
  })

  it('keeps everything before it as history, in order', () => {
    const out = splitTranscript([
      msg('user', 'a'),
      msg('assistant', 'b'),
      msg('user', 'c'),
    ])
    expect(out?.history).toEqual([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ])
  })

  it('never puts the current question into its own history', () => {
    const out = splitTranscript([msg('user', 'only')])
    expect(out?.message).toBe('only')
    expect(out?.history).toEqual([])
  })

  it('ignores assistant turns that trail the last user turn', () => {
    const out = splitTranscript([
      msg('user', 'q'),
      msg('assistant', 'a'),
    ])
    expect(out?.message).toBe('q')
    expect(out?.history).toEqual([])
  })

  it('caps history at 20 turns so the payload stays bounded', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      msg(i % 2 === 0 ? 'user' : 'assistant', `m${i}`)
    )
    const out = splitTranscript([...many, msg('user', 'now')])
    expect(out?.history.length).toBe(20)
  })

  it('returns null when there is no user turn at all', () => {
    expect(splitTranscript([msg('assistant', 'hi')])).toBeNull()
    expect(splitTranscript([])).toBeNull()
  })
})

describe('appendSuggestions', () => {
  it('returns the bare answer when nothing was recommended', () => {
    expect(appendSuggestions('مرحبا', [], [], 'ar')).toBe('مرحبا')
  })

  it('lists courses under an Arabic heading', () => {
    const out = appendSuggestions('نص', [{ title: 'أساسيات' }], [], 'ar')
    expect(out).toContain('كورسات مقترحة:')
    expect(out).toContain('• أساسيات')
  })

  it('lists jobs with their company in English', () => {
    const out = appendSuggestions('text', [], [{ title: 'Dev', company: 'Acme' }], 'en')
    expect(out).toContain('Suggested jobs:')
    expect(out).toContain('• Dev — Acme')
  })

  it('omits the dash when a job has no company', () => {
    const out = appendSuggestions('text', [], [{ title: 'Dev' }], 'en')
    expect(out).toContain('• Dev')
    expect(out).not.toContain('Dev —')
  })

  it('shows at most three of each', () => {
    const courses = Array.from({ length: 9 }, (_, i) => ({ title: `c${i}` }))
    const out = appendSuggestions('x', courses, [], 'en')
    expect(out).toContain('• c2')
    expect(out).not.toContain('• c3')
  })
})
