import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import { getVideoAnalyticsSummary } from '@/lib/video-providers/video-analytics'

export const runtime = 'nodejs'

export async function GET() {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const summary = await getVideoAnalyticsSummary()
  return NextResponse.json(summary)
}
