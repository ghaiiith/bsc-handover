/** Consistent IQD rounding — whole dinars. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

export function roundPercentage(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
