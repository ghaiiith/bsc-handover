'use server'

import { randomUUID } from 'crypto'
import { sanitizeSearchTerm } from '@/lib/search/sanitize'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { step1Schema, type Step1FormValues } from '@/lib/instructor/course-wizard-schemas'
import { ensureUniqueCourseSlug } from '@/lib/courses/resolve-learn-route'

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

export interface SelectableInstructor {
  id: string
  full_name: string
  full_name_ar: string | null
}

export async function getSelectableInstructors(
  query?: string
): Promise<SelectableInstructor[]> {
  if (!(await verifyAdmin())) return []

  const admin = createAdminClient()
  let request = admin
    .from('users')
    .select('id, full_name, full_name_ar')
    .eq('role', 'instructor')
    .eq('is_active', true)
    .order('full_name')
    .limit(20)

  const term = sanitizeSearchTerm(query)
  if (term) {
    request = request.or(`full_name.ilike.%${term}%,full_name_ar.ilike.%${term}%`)
  }

  const { data } = await request
  return (data ?? []) as SelectableInstructor[]
}

/**
 * Admin creates a course attributed to a chosen instructor. The course is
 * owned by that instructor and co-managed by admins (joint management).
 */
export async function createCourseForInstructor(
  instructorId: string,
  values: Step1FormValues,
  locale: string
): Promise<{ success: boolean; courseId?: string; error?: string }> {
  if (!(await verifyAdmin())) return { success: false, error: 'unauthorized' }

  const parsed = step1Schema.safeParse(values)
  if (!parsed.success) return { success: false, error: 'validation_failed' }

  const admin = createAdminClient()

  const { data: instructor } = await admin
    .from('users')
    .select('id, role')
    .eq('id', instructorId)
    .single()

  if (!instructor || instructor.role !== 'instructor') {
    return { success: false, error: 'invalid_instructor' }
  }

  const newCourseId = randomUUID()
  const slug = await ensureUniqueCourseSlug(parsed.data.title, newCourseId)

  const { data, error } = await admin
    .from('courses')
    .insert({
      id: newCourseId,
      slug,
      title: parsed.data.title,
      title_ar: parsed.data.title_ar,
      description: parsed.data.description,
      description_ar: parsed.data.description_ar,
      category: parsed.data.category,
      level: parsed.data.level,
      language: parsed.data.language,
      status: 'draft',
      instructor_id: instructorId,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'insert_failed' }
  }

  revalidatePath(`/${locale}/admin/courses`)
  revalidatePath(`/${locale}/instructor/courses`)
  return { success: true, courseId: data.id as string }
}
