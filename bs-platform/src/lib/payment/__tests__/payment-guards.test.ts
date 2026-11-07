import { describe, it, expect, afterEach, vi } from 'vitest'
import { isWaylPaidStatus } from '@/lib/payment/gateways/wayl'
import { getWaylMinAmount, isPaymentDevMode } from '@/lib/payment/config'
import {
  computeSeatPricing,
  tierDiscountFor,
  parseSeatTiers,
} from '@/lib/company/academy-pricing'

/**
 * Report BS-55: the money path had NO automated coverage. These pin the rules a
 * silent regression would otherwise break — what counts as paid, the gateway
 * minimum that was rejecting every sub-1000 IQD checkout, and the bulk pricing
 * a company is actually charged.
 */
describe('wayl paid-status matching', () => {
  it('accepts only exact paid statuses', () => {
    for (const s of ['paid', 'completed', 'success', 'captured', 'settled', 'APPROVED']) {
      expect(isWaylPaidStatus(s)).toBe(true)
    }
  })

  it('never treats a negated status as paid', () => {
    // The bug this guards: a substring match would read "unpaid" as paid.
    for (const s of ['unpaid', 'not_approved', 'failed', 'pending', 'cancelled', '', null]) {
      expect(isWaylPaidStatus(s)).toBe(false)
    }
  })
})

describe('gateway minimum (BS-55)', () => {
  const original = process.env.WAYL_MIN_AMOUNT
  afterEach(() => {
    if (original === undefined) delete process.env.WAYL_MIN_AMOUNT
    else process.env.WAYL_MIN_AMOUNT = original
  })

  it('defaults to the 1000 IQD floor thewayl.com enforces', () => {
    delete process.env.WAYL_MIN_AMOUNT
    expect(getWaylMinAmount()).toBe(1000)
  })

  it('is admin-overridable and ignores nonsense values', () => {
    process.env.WAYL_MIN_AMOUNT = '2500'
    expect(getWaylMinAmount()).toBe(2500)
    process.env.WAYL_MIN_AMOUNT = 'abc'
    expect(getWaylMinAmount()).toBe(1000)
  })
})

describe('dev-mode bypass stays off in production', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('refuses to enable the callback bypass in production', () => {
    // Guards the free-enrolment hole: the dev callback trusts `status=success`
    // from the browser, so it must never activate on the live site.
    vi.stubEnv('PAYMENT_DEV_MODE', 'true')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isPaymentDevMode()).toBe(false)
  })

  it('allows it only outside production', () => {
    vi.stubEnv('PAYMENT_DEV_MODE', 'true')
    vi.stubEnv('NODE_ENV', 'development')
    expect(isPaymentDevMode()).toBe(true)
  })
})

describe('academy seat pricing (BS-70/80)', () => {
  const tiers = parseSeatTiers(
    '[{"minSeats":5,"discountPct":10},{"minSeats":20,"discountPct":20}]'
  )

  it('parses and sorts admin-configured tiers', () => {
    expect(tiers).toEqual([
      { minSeats: 5, discountPct: 10 },
      { minSeats: 20, discountPct: 20 },
    ])
  })

  it('applies the highest tier the seat count qualifies for', () => {
    expect(tierDiscountFor(1, tiers)).toBe(0)
    expect(tierDiscountFor(5, tiers)).toBe(10)
    expect(tierDiscountFor(19, tiers)).toBe(10)
    expect(tierDiscountFor(20, tiers)).toBe(20)
  })

  it('charges the discounted bulk total and reports the real saving', () => {
    const p = computeSeatPricing(500, 20, tiers)
    expect(p.normalTotal).toBe(10000)
    expect(p.discountPct).toBe(20)
    expect(p.bulkTotal).toBe(8000)
    expect(p.saved).toBe(2000)
  })

  it('never charges below zero or on a negative seat count', () => {
    const p = computeSeatPricing(500, -3, tiers)
    expect(p.seats).toBe(0)
    expect(p.bulkTotal).toBe(0)
  })

  it('falls back to full price when no tiers are configured', () => {
    const p = computeSeatPricing(1000, 50, [])
    expect(p.discountPct).toBe(0)
    expect(p.bulkTotal).toBe(50000)
  })
})
