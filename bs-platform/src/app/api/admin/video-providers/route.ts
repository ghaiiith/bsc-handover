import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import {
  getProviderHealthHistory,
  runProviderHealthChecks,
} from '@/lib/video-providers/provider-health'
import {
  getProviderSettings,
  setPrimaryProvider,
  updateProviderSetting,
} from '@/lib/video-providers/provider-settings'
import { getVideoProvider } from '@/lib/video-providers/provider-factory'
import { isVideoProviderId } from '@/lib/video-providers/provider-registry'
import type { VideoProviderId } from '@/lib/video-providers/types'

export const runtime = 'nodejs'

export async function GET() {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const settings = await getProviderSettings()
  return NextResponse.json({ providers: settings })
}

export async function PATCH(request: Request) {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    providerId?: string
    enabled?: boolean
    isPrimary?: boolean
    priority?: number
    region?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!body.providerId || !isVideoProviderId(body.providerId)) {
    return NextResponse.json({ error: 'invalid_provider' }, { status: 400 })
  }

  if (body.isPrimary) {
    await setPrimaryProvider(body.providerId)
  }

  const updated = await updateProviderSetting(body.providerId as VideoProviderId, {
    ...(body.enabled != null ? { enabled: body.enabled } : {}),
    ...(body.priority != null ? { priority: body.priority } : {}),
    ...(body.region != null ? { region: body.region } : {}),
  })

  return NextResponse.json({ provider: updated })
}

export async function POST(request: Request) {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action === 'health-check-all') {
    await runProviderHealthChecks()
    const settings = await getProviderSettings()
    return NextResponse.json({ ok: true, providers: settings })
  }

  let body: { providerId?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (body.providerId && isVideoProviderId(body.providerId)) {
    const provider = await getVideoProvider(body.providerId)
    const result = await provider.healthCheck()
    await updateProviderSetting(body.providerId, {
      status: result.status,
      last_health_check: result.checkedAt,
      last_error: result.error ?? null,
    })
    const history = await getProviderHealthHistory(body.providerId, 10)
    return NextResponse.json({ result, history })
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}
