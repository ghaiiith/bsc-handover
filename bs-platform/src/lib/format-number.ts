/** Always format numbers with Western (English) digits, even in Arabic UI. */
const EN_NUMBER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

/**
 * IQD is stored and charged in whole dinars (no fils). Normalize DB/JSON/form
 * values to a safe integer and correct near-integer float drift.
 */
export function normalizeMoneyAmount(
  amount: number | string | null | undefined
): number {
  if (amount == null || amount === '') return 0

  const raw =
    typeof amount === 'string'
      ? amount.replace(/,/g, '').replace(/\s/g, '').trim()
      : amount

  const n = typeof raw === 'string' ? Number(raw) : raw
  if (!Number.isFinite(n)) return 0

  return Math.round(n)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', options).format(normalizeMoneyAmount(value))
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatPrice(amount: number | string, currency = 'IQD'): string {
  const value = normalizeMoneyAmount(amount)
  const digits = EN_NUMBER.format(value)

  if (currency === 'IQD') {
    return `IQD\u00a0${digits}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatCount(value: number): string {
  return EN_NUMBER.format(value)
}
