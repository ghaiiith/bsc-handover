import 'server-only'

import {
  calculateGatewayFee,
  calculateNetReceived,
  resolveGatewayForPayment,
} from '@/lib/revenue/gateway-config'
import type {
  RevenueCalculationInput,
  RevenueCalculationResult,
} from '@/lib/revenue/types'
import { roundMoney, roundPercentage } from '@/lib/revenue/money'

/**
 * Enterprise commission engine.
 * Order: gross → gateway fee → net → commission split on net ONLY.
 */
export async function calculateRevenueBreakdown(
  input: RevenueCalculationInput
): Promise<RevenueCalculationResult> {
  const gateway = await resolveGatewayForPayment(
    input.gatewayId,
    input.gatewayType ?? 'local'
  )

  const gatewayTotalFee = calculateGatewayFee(input.grossAmount, gateway)
  const netReceivedAmount = calculateNetReceived(input.grossAmount, gatewayTotalFee)

  const platformPct = roundPercentage(input.agreement.platform_percentage)
  const instructorPct = roundPercentage(input.agreement.instructor_percentage)

  let platformRevenue: number
  let instructorRevenue: number

  const discount = input.discount
  if (discount && discount.originalAmount > 0) {
    // Report BS-48: attribute each party's discount to that party's own share.
    // Base shares are taken on the LIST price; each party's granted discount is
    // then subtracted from its own base, so a discount never moves money out of
    // the other party's balance. The two shares sum to what the customer paid.
    const platformShare =
      discount.originalAmount * (platformPct / 100) - discount.platformDiscountAmount
    const instructorShare =
      discount.originalAmount * (instructorPct / 100) - discount.instructorDiscountAmount

    // The gateway fee is borne in proportion to each party's post-discount share.
    const charged = input.grossAmount
    const platformFee = charged > 0 ? gatewayTotalFee * (platformShare / charged) : 0

    platformRevenue = roundMoney(Math.max(0, platformShare - platformFee))
    instructorRevenue = roundMoney(Math.max(0, netReceivedAmount - platformRevenue))
  } else {
    platformRevenue = roundMoney(netReceivedAmount * (platformPct / 100))
    instructorRevenue = roundMoney(netReceivedAmount - platformRevenue)
  }

  return {
    grossAmount: roundMoney(input.grossAmount),
    gatewayType: gateway.gateway_type,
    gatewayPercentage: gateway.percentage_fee,
    gatewayFixedFee: gateway.fixed_fee,
    gatewayTotalFee,
    netReceivedAmount,
    platformPercentage: platformPct,
    instructorPercentage: instructorPct,
    platformRevenue,
    instructorRevenue,
    agreementId: input.agreement.id,
    exchangeRate: input.exchangeRate ?? null,
    gatewayId: gateway.gateway_id,
  }
}
