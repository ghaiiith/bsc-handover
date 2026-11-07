import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { createSection, reorderSections } from '@/lib/studio/cms/curriculum'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ courseId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  try {
    const body = (await request.json()) as { title: string; title_ar: string }
    const result = await createSection(courseId, body.title, body.title_ar)
    return cmsJson(result, 201)
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'create_failed', 400)
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId } = await context.params
  try {
    const body = (await request.json()) as { sectionIds: string[] }
    await reorderSections(courseId, body.sectionIds)
    return cmsJson({ ok: true })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'reorder_failed', 400)
  }
}
