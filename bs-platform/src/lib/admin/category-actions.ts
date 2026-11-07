'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export interface CategoryActionResult {
  success?: boolean
  error?: string
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function revalidateCategories() {
  revalidateTag('course-categories', 'max')
}

async function uniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient()
  const root = base || 'category'
  let candidate = root
  for (let i = 1; i < 50; i += 1) {
    const { data } = await admin
      .from('course_categories')
      .select('id')
      .eq('value', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${root}-${i + 1}`
  }
  return `${root}-${Date.now()}`
}

export async function createCourseCategory(
  input: { labelAr: string; labelEn: string; value?: string },
  locale: string
): Promise<CategoryActionResult> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const labelAr = input.labelAr.trim()
  const labelEn = input.labelEn.trim()
  if (!labelAr || !labelEn) return { error: 'labels_required' }

  const base = slugify(input.value?.trim() || input.labelEn)
  if (!base) return { error: 'invalid_value' }
  const value = await uniqueSlug(base)

  const admin = createAdminClient()

  const { data: maxRow } = await admin
    .from('course_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxRow?.sort_order ?? 0) + 1

  const { error } = await admin.from('course_categories').insert({
    value,
    label_ar: labelAr,
    label_en: labelEn,
    sort_order: nextOrder,
    is_active: true,
  })

  if (error) {
    return { error: error.code === '23505' ? 'value_exists' : 'create_failed' }
  }

  revalidateCategories()
  revalidatePath(`/${locale}/admin/categories`)
  return { success: true }
}

export async function updateCourseCategory(
  id: string,
  input: { labelAr: string; labelEn: string },
  locale: string
): Promise<CategoryActionResult> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const labelAr = input.labelAr.trim()
  const labelEn = input.labelEn.trim()
  if (!labelAr || !labelEn) return { error: 'labels_required' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('course_categories')
    .update({ label_ar: labelAr, label_en: labelEn, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: 'update_failed' }

  revalidateCategories()
  revalidatePath(`/${locale}/admin/categories`)
  return { success: true }
}

export async function toggleCourseCategory(
  id: string,
  isActive: boolean,
  locale: string
): Promise<CategoryActionResult> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('course_categories')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: 'update_failed' }

  revalidateCategories()
  revalidatePath(`/${locale}/admin/categories`)
  return { success: true }
}
