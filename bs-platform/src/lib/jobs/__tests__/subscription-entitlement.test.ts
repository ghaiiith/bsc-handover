import { describe, it, expect } from 'vitest'
import { computePeriodEnd } from '@/lib/jobs/employer-subscription'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-09-02T12:00:00.000Z')
const days = (from: Date, iso: string) =>
  Math.round((new Date(iso).getTime() - from.getTime()) / DAY)

describe('computePeriodEnd — paid renewals stack (BS-99)', () => {
  it('adds the plan duration on top of the days already paid for', () => {
    const existing = new Date(now.getTime() + 14 * DAY).toISOString()
    const end = computePeriodEnd(30, now, existing, true)
    expect(days(now, end)).toBe(44)
  })

  it('starts from now when the previous period already ended', () => {
    const expired = new Date(now.getTime() - 5 * DAY).toISOString()
    const end = computePeriodEnd(30, now, expired, true)
    expect(days(now, end)).toBe(30)
  })

  it('starts from now when there is no previous period', () => {
    expect(days(now, computePeriodEnd(30, now, null, true))).toBe(30)
  })
})

describe('computePeriodEnd — free activations never inherit paid time', () => {
  it('ignores the remaining paid days instead of stacking on them', () => {
    const existing = new Date(now.getTime() + 14 * DAY).toISOString()
    const end = computePeriodEnd(30, now, existing, false)
    expect(days(now, end)).toBe(30)
  })

  it('a two-month grant is 60 days from now, not 60 on top of what is left', () => {
    const existing = new Date(now.getTime() + 20 * DAY).toISOString()
    const end = computePeriodEnd(60, now, existing, false)
    expect(days(now, end)).toBe(60)
  })
})

describe('the toggle exploit is arithmetically closed', () => {
  it('repeated free activations cannot accumulate time', () => {
    // Free -> Pro -> Free -> Pro, each one non-stacking, always 30 days out.
    let end = computePeriodEnd(30, now, null, false)
    for (let i = 0; i < 3; i++) {
      end = computePeriodEnd(30, now, end, false)
    }
    expect(days(now, end)).toBe(30)
  })

  it('but genuine repeat purchases do accumulate', () => {
    let end = computePeriodEnd(30, now, null, true)
    for (let i = 0; i < 3; i++) {
      end = computePeriodEnd(30, now, end, true)
    }
    expect(days(now, end)).toBe(120)
  })
})
