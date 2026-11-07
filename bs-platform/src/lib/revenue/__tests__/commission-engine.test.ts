import { describe, it, expect, vi } from 'vitest'

// The engine resolves a gateway config; stub it to a zero-fee local gateway so
// the tests isolate the discount-attribution math (report BS-48).
vi.mock('@/lib/revenue/gateway-config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/revenue/gateway-config')>(
    '@/lib/revenue/gateway-config'
  )
  return {
    ...actual,
    resolveGatewayForPayment: vi.fn(async () => ({
      gateway_id: 'test',
      gateway_type: 'local' as const,
      percentage_fee: 0,
      fixed_fee: 0,
    })),
  }
})

import { calculateRevenueBreakdown } from '@/lib/revenue/commission-engine'

const agreement = { id: 'a1', platform_percentage: 30, instructor_percentage: 70 }

function run(grossAmount: number, discount?: {
  originalAmount: number
  platformDiscountAmount: number
  instructorDiscountAmount: number
}) {
  return calculateRevenueBreakdown({
    grossAmount,
    gatewayId: 'test',
    instructorId: 'i1',
    agreement,
    discount: discount ?? null,
  })
}

describe('commission engine — discount attribution (BS-48)', () => {
  it('splits by percentage when there is no discount', async () => {
    const r = await run(100_000)
    expect(r.platformRevenue).toBe(30_000)
    expect(r.instructorRevenue).toBe(70_000)
    expect(r.platformRevenue + r.instructorRevenue).toBe(100_000)
  })

  it('charges an INSTRUCTOR discount entirely to the instructor', async () => {
    // list 100k, instructor grants 20% → customer pays 80k.
    const r = await run(80_000, {
      originalAmount: 100_000,
      platformDiscountAmount: 0,
      instructorDiscountAmount: 20_000,
    })
    // Platform keeps its full 30k; instructor absorbs the whole 20k discount.
    expect(r.platformRevenue).toBe(30_000)
    expect(r.instructorRevenue).toBe(50_000)
    expect(r.platformRevenue + r.instructorRevenue).toBe(80_000)
  })

  it('charges an ADMIN/platform discount entirely to the platform', async () => {
    // list 100k, platform grants 10% → customer pays 90k.
    const r = await run(90_000, {
      originalAmount: 100_000,
      platformDiscountAmount: 10_000,
      instructorDiscountAmount: 0,
    })
    expect(r.platformRevenue).toBe(20_000)
    expect(r.instructorRevenue).toBe(70_000)
    expect(r.platformRevenue + r.instructorRevenue).toBe(90_000)
  })

  it('never lets a discount pull funds from the other party (the bug)', async () => {
    // Old behavior gave platform 30% of the discounted 80k = 24k (platform lost
    // 6k). The fix must keep the platform whole at 30k.
    const r = await run(80_000, {
      originalAmount: 100_000,
      platformDiscountAmount: 0,
      instructorDiscountAmount: 20_000,
    })
    expect(r.platformRevenue).toBeGreaterThanOrEqual(30_000)
  })

  it('handles both parties discounting at once', async () => {
    // platform 10% + instructor 20% → customer pays 70k.
    const r = await run(70_000, {
      originalAmount: 100_000,
      platformDiscountAmount: 10_000,
      instructorDiscountAmount: 20_000,
    })
    expect(r.platformRevenue).toBe(20_000)
    expect(r.instructorRevenue).toBe(50_000)
    expect(r.platformRevenue + r.instructorRevenue).toBe(70_000)
  })

  it('a maximal (70%) instructor discount zeroes the instructor, platform stays whole', async () => {
    // instructor discounts its entire 70% share → customer pays the platform's 30k.
    const r = await run(30_000, {
      originalAmount: 100_000,
      platformDiscountAmount: 0,
      instructorDiscountAmount: 70_000,
    })
    expect(r.platformRevenue).toBe(30_000)
    expect(r.instructorRevenue).toBe(0)
  })

  it('a full 100% discount yields zero for both, no negatives', async () => {
    const r = await run(0, {
      originalAmount: 100_000,
      platformDiscountAmount: 30_000,
      instructorDiscountAmount: 70_000,
    })
    expect(r.platformRevenue).toBe(0)
    expect(r.instructorRevenue).toBe(0)
  })
})
