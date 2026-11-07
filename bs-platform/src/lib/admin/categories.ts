import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { COURSE_CATEGORIES, type CategoryOption } from '@/lib/constants'

export type { CategoryOption }

export interface CourseCategoryRow extends CategoryOption {
  id: string
  sortOrder: number
  isActive: boolean
}

async function fetchActiveCourseCategories(): Promise<CategoryOption[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('course_categories')
    .select('value, label_ar, label_en')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error || !data || data.length === 0) {
    // Fall back to the seeded constant if the table is missing/empty.
    return COURSE_CATEGORIES
  }

  return data.map((row) => ({
    value: row.value as string,
    label: row.label_ar as string,
    labelEn: row.label_en as string,
  }))
}

/**
 * Active course categories, cached. Single source of truth for category
 * pickers, filters and label lookups across the platform.
 */
export const getCourseCategories = unstable_cache(
  fetchActiveCourseCategories,
  ['course-categories'],
  { revalidate: 300, tags: ['course-categories'] }
)

/** All categories (including inactive) for the admin management screen. */
export async function getAllCourseCategories(): Promise<CourseCategoryRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('course_categories')
    .select('id, value, label_ar, label_en, sort_order, is_active')
    .order('sort_order', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id as string,
    value: row.value as string,
    label: row.label_ar as string,
    labelEn: row.label_en as string,
    sortOrder: row.sort_order as number,
    isActive: row.is_active as boolean,
  }))
}
