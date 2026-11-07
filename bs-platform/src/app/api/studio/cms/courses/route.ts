import { NextRequest } from 'next/server'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'
import {
  bulkCourseAction,
  createCourse,
  listCourses,
  type AdminCourseStatusFilter,
} from '@/lib/studio/cms/courses'
import { cmsError, cmsJson, cmsUnauthorized } from '@/lib/studio/cms/response'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  const sp = request.nextUrl.searchParams
  try {
    const result = await listCourses({
      status: (sp.get('status') as AdminCourseStatusFilter) ?? 'all',
      category: sp.get('category') ?? undefined,
      q: sp.get('q') ?? undefined,
      sort: (sp.get('sort') as 'updated_at' | 'title' | 'created_at' | 'price') ?? 'updated_at',
      order: (sp.get('order') as 'asc' | 'desc') ?? 'desc',
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
    })
    return cmsJson(result)
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'list_failed', 500)
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) return cmsUnauthorized()

  try {
    const body = (await request.json()) as Record<string, string>
    const result = await createCourse({
      instructorId: body.instructorId,
      title: body.title,
      title_ar: body.title_ar,
      description: body.description,
      description_ar: body.description_ar,
      category: body.category,
      level: body.level ?? 'beginner',
      language: body.language ?? 'ar',
    })
    return cmsJson(result, 201)
  } catch (err) {
    return cmsError(err instanceof Error ? err.message : 'create_failed', 400)
  }
}
