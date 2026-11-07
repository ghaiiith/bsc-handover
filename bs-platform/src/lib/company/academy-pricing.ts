// Report BS-70: pure seat-pricing math for the Company Academy bulk calculator.
// Shared by the server page and the client calculator (no server-only imports).

export interface SeatTier {
  minSeats: number
  discountPct: number
}

export interface SeatPricing {
  seats: number
  unitPrice: number
  normalTotal: number
  discountPct: number
  bulkTotal: number
  saved: number
}

/** The best (highest) tier discount the seat count qualifies for; 0 if none. */
export function tierDiscountFor(seats: number, tiers: SeatTier[]): number {
  return tiers
    .filter((t) => seats >= t.minSeats)
    .reduce((best, t) => Math.max(best, t.discountPct), 0)
}

export function computeSeatPricing(
  unitPrice: number,
  seats: number,
  tiers: SeatTier[]
): SeatPricing {
  const safeSeats = Math.max(0, Math.floor(seats || 0))
  const normalTotal = unitPrice * safeSeats
  const discountPct = tierDiscountFor(safeSeats, tiers)
  const bulkTotal = Math.round(normalTotal * (1 - discountPct / 100))
  return {
    seats: safeSeats,
    unitPrice,
    normalTotal,
    discountPct,
    bulkTotal,
    saved: normalTotal - bulkTotal,
  }
}

export function parseSeatTiers(raw: unknown): SeatTier[] {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(arr)) return []
    return arr
      .map((t) => ({
        minSeats: Number((t as SeatTier).minSeats),
        discountPct: Number((t as SeatTier).discountPct),
      }))
      .filter((t) => Number.isFinite(t.minSeats) && Number.isFinite(t.discountPct) && t.minSeats > 0)
      .sort((a, b) => a.minSeats - b.minSeats)
  } catch {
    return []
  }
}
