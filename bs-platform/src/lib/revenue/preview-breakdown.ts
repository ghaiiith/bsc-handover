import { roundMoney } from '@/lib/revenue/money'

function calculateNetReceived(grossAmount: number, gatewayTotalFee: number): number {
  return roundMoney(Math.max(0, grossAmount - gatewayTotalFee))
}

/** Client-safe preview for admin UI — no persistence, no server imports. */
export function previewRevenueBreakdown(input: {
  coursePrice: number
  platformPercentage: number
  instructorPercentage: number
  gatewayPercentage: number
  gatewayFixedFee: number
}): {
  gatewayTotalFee: number
  netReceivedAmount: number
  platformRevenue: number
  instructorRevenue: number
} {
  const gatewayTotalFee = roundMoney(
    input.coursePrice * (input.gatewayPercentage / 100) + input.gatewayFixedFee
  )
  const netReceivedAmount = calculateNetReceived(input.coursePrice, gatewayTotalFee)
  const platformRevenue = roundMoney(
    netReceivedAmount * (input.platformPercentage / 100)
  )
  const instructorRevenue = roundMoney(netReceivedAmount - platformRevenue)

  return { gatewayTotalFee, netReceivedAmount, platformRevenue, instructorRevenue }
}
