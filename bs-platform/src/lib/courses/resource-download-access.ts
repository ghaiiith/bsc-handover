import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface CourseResourceDownloadContext {
  allowed: boolean
  resource: {
    id: string
    course_id: string
    title: string
    file_url: string
    file_type: string
    url_access_mode?: string | null
  } | null
}

export async function resolveCourseResourceDownloadAccess(
  courseId: string,
  resourceId: string
): Promise<CourseResourceDownloadContext> {
  const admin = createAdminClient()

  const { data: resourceRow } = await admin
    .from('course_resources')
    .select('id, course_id, title, file_url, file_type, url_access_mode')
    .eq('id', resourceId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!resourceRow) {
    return { allowed: false, resource: null }
  }

  const resource = {
    id: resourceRow.id as string,
    course_id: resourceRow.course_id as string,
    title: resourceRow.title as string,
    file_url: resourceRow.file_url as string,
    file_type: resourceRow.file_type as string,
    url_access_mode: (resourceRow.url_access_mode as string | null) ?? 'download',
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false, resource }
  }

  const [{ data: profile }, { data: course }, { data: enrollment }] = await Promise.all([
    admin.from('users').select('role, is_active').eq('id', user.id).maybeSingle(),
    admin.from('courses').select('instructor_id').eq('id', courseId).maybeSingle(),
    admin
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle(),
  ])

  if (profile?.is_active === false) {
    return { allowed: false, resource }
  }

  const isAdmin = profile?.role === 'admin'
  const isOwner = course?.instructor_id === user.id
  const isEnrolled = Boolean(enrollment)

  return {
    allowed: isAdmin || isOwner || isEnrolled,
    resource,
  }
}
