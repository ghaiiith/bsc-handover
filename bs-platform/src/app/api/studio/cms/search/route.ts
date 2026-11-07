import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { globalSearch, getRecentActivity, listInstructors } from '@/lib/studio/cms/search'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const sp = request.nextUrl.searchParams
  const q = sp.get('q') ?? ''

  try {
    const results = await globalSearch(q, sp.get('limit') ? Number(sp.get('limit')) : 30)
    return cmsJson({ results })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'search_failed', 500)
  }
}
