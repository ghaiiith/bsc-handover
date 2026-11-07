import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { listInstructors } from '@/lib/studio/cms/search'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const q = request.nextUrl.searchParams.get('q') ?? undefined
  try {
    const instructors = await listInstructors(q)
    return cmsJson({ instructors })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'list_failed', 500)
  }
}
