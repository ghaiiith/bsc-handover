import { describe, it, expect } from 'vitest'
import { parseFeatures, parseAiLimits, resolvePeriod } from '@/lib/subscription/entitlements'

describe('parseFeatures (BS-106/107)', () => {
  it('defaults to the Free-plan shape when nothing is stored', () => {
    expect(parseFeatures(null)).toEqual({
      ai_matching: false,
      ai_chatbot: 'limited',
      hr_chatbot: false,
      featured_jobs: false,
      email_alerts: false,
    })
  })

  it('only treats literal true as enabled — no string "true" surprises', () => {
    expect(parseFeatures({ ai_matching: 'true' }).ai_matching).toBe(false)
    expect(parseFeatures({ ai_matching: 1 }).ai_matching).toBe(false)
    expect(parseFeatures({ ai_matching: true }).ai_matching).toBe(true)
  })

  it('accepts only the three chatbot levels and falls back to limited', () => {
    expect(parseFeatures({ ai_chatbot: 'full' }).ai_chatbot).toBe('full')
    expect(parseFeatures({ ai_chatbot: 'none' }).ai_chatbot).toBe('none')
    expect(parseFeatures({ ai_chatbot: 'premium' }).ai_chatbot).toBe('limited')
  })
})

describe('parseAiLimits', () => {
  it('keeps non-negative integers and drops everything else', () => {
    expect(parseAiLimits({ ai_matching: 200, hr_chatbot: '50', ai_chatbot: -1 })).toEqual({
      ai_matching: 200,
      hr_chatbot: 50,
    })
  })

  it('ignores unknown services', () => {
    expect(parseAiLimits({ something_else: 10 })).toEqual({})
  })

  it('an absent key means unlimited — not zero', () => {
    expect(parseAiLimits({})).not.toHaveProperty('ai_matching')
  })
})

describe('resolvePeriod — counters reset on the right cycle (BS-107)', () => {
  const now = new Date('2026-09-20T10:00:00Z')

  it('uses the paid subscription billing window when it is live', () => {
    const end = '2026-10-05T00:00:00Z'
    const p = resolvePeriod(now, end, 30)
    expect(p.end.toISOString()).toBe('2026-10-05T00:00:00.000Z')
    expect(p.start.toISOString()).toBe('2026-09-05T00:00:00.000Z')
  })

  it('falls back to the calendar month when there is no subscription', () => {
    const p = resolvePeriod(now, null, 30)
    expect(p.start.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(p.end.toISOString()).toBe('2026-10-01T00:00:00.000Z')
  })

  it('treats an expired subscription like no subscription', () => {
    const p = resolvePeriod(now, '2026-09-01T00:00:00Z', 30)
    expect(p.start.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(p.end.toISOString()).toBe('2026-10-01T00:00:00.000Z')
  })

  it('rolls the calendar month over December correctly', () => {
    const dec = new Date('2026-12-15T00:00:00Z')
    const p = resolvePeriod(dec, null, 30)
    expect(p.end.toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })
})
