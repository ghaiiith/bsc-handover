import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import { listActiveAgreementsWithInstructors } from '@/lib/revenue/agreements'
import { getAllGatewayConfigs, updateGatewayConfig } from '@/lib/revenue/gateway-config'

export const runtime = 'nodejs'

export async function GET() {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [agreements, gateways] = await Promise.all([
    listActiveAgreementsWithInstructors(),
    getAllGatewayConfigs(),
  ])

  return NextResponse.json({
    agreements: agreements.map((a) => ({
      instructor_id: a.instructor_id,
      instructor_name: a.instructor_name,
      instructor_name_ar: a.instructor_name_ar,
      instructor_email: a.instructor_email,
      platform_percentage: a.platform_percentage,
      instructor_percentage: a.instructor_percentage,
      effective_date: a.effective_date,
      notes: a.notes,
    })),
    gateways,
  })
}

export async function PATCH(request: Request) {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    gatewayId?: string
    percentageFee?: number
    fixedFee?: number
    enabled?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!body.gatewayId) {
    return NextResponse.json({ error: 'invalid_gateway' }, { status: 400 })
  }

  const updated = await updateGatewayConfig(body.gatewayId, {
    ...(body.percentageFee != null ? { percentage_fee: body.percentageFee } : {}),
    ...(body.fixedFee != null ? { fixed_fee: body.fixedFee } : {}),
    ...(body.enabled != null ? { enabled: body.enabled } : {}),
  })

  return NextResponse.json({ gateway: updated })
}
