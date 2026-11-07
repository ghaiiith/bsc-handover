export type GatewayType = 'local' | 'international'

export type AgreementStatus = 'active' | 'archived'

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'held'

export interface InstructorRevenueAgreement {
  id: string
  instructor_id: string
  platform_percentage: number
  instructor_percentage: number
  effective_date: string
  status: AgreementStatus
  created_by: string | null
  updated_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaymentGatewayConfig {
  gateway_id: string
  display_name: string
  gateway_type: GatewayType
  percentage_fee: number
  fixed_fee: number
  currency: string
  settlement_delay_days: number
  refund_fee: number
  enabled: boolean
  created_at: string
  updated_at: string
}

/** Immutable financial breakdown computed at payment completion. */
export interface PaymentFinancialBreakdown {
  grossAmount: number
  gatewayType: GatewayType
  gatewayPercentage: number
  gatewayFixedFee: number
  gatewayTotalFee: number
  netReceivedAmount: number
  platformPercentage: number
  instructorPercentage: number
  platformRevenue: number
  instructorRevenue: number
  agreementId: string
  exchangeRate?: number | null
}

/**
 * Report BS-48: how a discount is attributed between the two parties. Each
 * party bears the discount IT granted — the platform must never subsidize an
 * instructor's (or an instructor-issued coupon's) discount, and vice versa.
 * Amounts are absolute dinars off the list price, already resolved from the
 * coupon's `party`. `originalAmount` is the pre-discount list price.
 */
export interface RevenueDiscountContext {
  originalAmount: number
  platformDiscountAmount: number
  instructorDiscountAmount: number
}

export interface RevenueCalculationInput {
  grossAmount: number
  gatewayId: string
  instructorId: string
  agreement: Pick<
    InstructorRevenueAgreement,
    'id' | 'platform_percentage' | 'instructor_percentage'
  >
  gatewayType?: GatewayType
  exchangeRate?: number | null
  /** Present when a coupon/discount was applied (report BS-48). */
  discount?: RevenueDiscountContext | null
}

export interface RevenueCalculationResult extends PaymentFinancialBreakdown {
  gatewayId: string
}

export interface AgreementWithInstructor extends InstructorRevenueAgreement {
  instructor_name: string
  instructor_name_ar: string | null
  instructor_email: string
}
