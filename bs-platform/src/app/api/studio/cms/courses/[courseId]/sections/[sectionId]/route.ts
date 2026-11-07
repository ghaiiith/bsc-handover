import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import { deleteSection, updateSection } from '@/lib/studio/cms/curriculum'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ courseId: string; sectionId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId, sectionId } = await context.params
  try {
    const body = (await request.json()) as { title?: string; title_ar?: string }
    await updateSection(courseId, sectionId, body)
    return cmsJson({ ok: true })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'update_failed', 400)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const { courseId, sectionId } = await context.params
  try {
    await deleteSection(courseId, sectionId)
    return cmsJson({ ok: true })
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'delete_failed', 500)
  }
}
