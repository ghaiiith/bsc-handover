import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { GatewayType, PaymentGatewayConfig } from '@/lib/revenue/types'
import { roundMoney, roundPercentage } from '@/lib/revenue/money'

function mapGateway(row: Record<string, unknown>): PaymentGatewayConfig {
  return {
    gateway_id: row.gateway_id as string,
    display_name: row.display_name as string,
    gateway_type: row.gateway_type as GatewayType,
    percentage_fee: Number(row.percentage_fee ?? 0),
    fixed_fee: Number(row.fixed_fee ?? 0),
    currency: (row.currency as string) ?? 'IQD',
    settlement_delay_days: Number(row.settlement_delay_days ?? 0),
    refund_fee: Number(row.refund_fee ?? 0),
    enabled: Boolean(row.enabled),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function getGatewayConfig(
  gatewayId: string
): Promise<PaymentGatewayConfig | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('payment_gateway_configs')
    .select('*')
    .eq('gateway_id', gatewayId)
    .maybeSingle()

  return data ? mapGateway(data) : null
}

export async function getAllGatewayConfigs(): Promise<PaymentGatewayConfig[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('payment_gateway_configs')
    .select('*')
    .order('gateway_id')

  return (data ?? []).map(mapGateway)
}

export async function updateGatewayConfig(
  gatewayId: string,
  updates: Partial<
    Pick<
      PaymentGatewayConfig,
      | 'percentage_fee'
      | 'fixed_fee'
      | 'gateway_type'
      | 'display_name'
      | 'enabled'
      | 'settlement_delay_days'
      | 'refund_fee'
    >
  >
): Promise<PaymentGatewayConfig | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_gateway_configs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('gateway_id', gatewayId)
    .select('*')
    .single()

  if (error || !data) return null
  return mapGateway(data)
}

/** Resolve gateway config for a payment method. Falls back to virtual (zero fee). */
export async function resolveGatewayForPayment(
  method: string,
  gatewayType: GatewayType = 'local'
): Promise<PaymentGatewayConfig> {
  const normalized = method === 'virtual' ? 'virtual' : method
  const config = await getGatewayConfig(normalized)

  if (config?.enabled) return config

  // Try international variant if local not found
  if (gatewayType === 'international') {
    const intl = await getGatewayConfig(`${normalized}_intl`)
    if (intl?.enabled) return intl
  }

  if (config) return config

  return {
    gateway_id: normalized,
    display_name: normalized,
    gateway_type: gatewayType,
    percentage_fee: 0,
    fixed_fee: 0,
    currency: 'IQD',
    settlement_delay_days: 0,
    refund_fee: 0,
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function calculateGatewayFee(
  grossAmount: number,
  config: Pick<PaymentGatewayConfig, 'percentage_fee' | 'fixed_fee'>
): number {
  const pctFee = roundMoney(grossAmount * (config.percentage_fee / 100))
  return roundMoney(pctFee + config.fixed_fee)
}

export function calculateNetReceived(grossAmount: number, gatewayTotalFee: number): number {
  return roundMoney(Math.max(0, grossAmount - gatewayTotalFee))
}

export function formatGatewayFeeSummary(
  config: Pick<PaymentGatewayConfig, 'percentage_fee' | 'fixed_fee' | 'currency'>
): string {
  return `${roundPercentage(config.percentage_fee)}% + ${roundMoney(config.fixed_fee)} ${config.currency}`
}
