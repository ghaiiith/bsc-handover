'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CommunityCategoryRow {
  value: string
  label_ar: string
  label_en: string
  emoji: string
  keywords: string[]
  sort_order: number
  is_active: boolean
}

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function listCommunityCategoriesAdmin(): Promise<CommunityCategoryRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('community_categories')
    .select('*')
    .order('sort_order', { ascending: true })
  return (data ?? []) as CommunityCategoryRow[]
}

export interface CommunityCategoryInput {
  value: string
  label_ar: string
  label_en: string
  emoji?: string
  keywords: string[]
  sort_order?: number
  is_active?: boolean
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
}

function validate(input: CommunityCategoryInput): string | null {
  if (!input.label_ar?.trim() || !input.label_en?.trim()) return 'labels_required'
  return null
}

export async function createCommunityCategory(
  input: CommunityCategoryInput,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const invalid = validate(input)
  if (invalid) return { error: invalid }

  const value = slugify(input.value || input.label_en)
  if (value.length < 2) return { error: 'invalid_value' }

  const admin = createAdminClient()
  const { error } = await admin.from('community_categories').insert({
    value,
    label_ar: input.label_ar.trim(),
    label_en: input.label_en.trim(),
    emoji: input.emoji?.trim() || '',
    keywords: input.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
  })

  if (error) return { error: error.code === '23505' ? 'value_taken' : error.message }
  revalidateTag('community-categories', 'max')
  revalidatePath(`/${locale}/admin/community-categories`)
  return { success: true }
}

export async function updateCommunityCategory(
  value: string,
  input: CommunityCategoryInput,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const invalid = validate(input)
  if (invalid) return { error: invalid }

  const admin = createAdminClient()
  const { error } = await admin
    .from('community_categories')
    .update({
      label_ar: input.label_ar.trim(),
      label_en: input.label_en.trim(),
      emoji: input.emoji?.trim() || '',
      keywords: input.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('value', value)

  if (error) return { error: error.message }
  revalidateTag('community-categories', 'max')
  revalidatePath(`/${locale}/admin/community-categories`)
  return { success: true }
}

export async function deleteCommunityCategory(
  value: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  const admin = createAdminClient()
  const { error } = await admin.from('community_categories').delete().eq('value', value)
  if (error) return { error: error.message }
  revalidateTag('community-categories', 'max')
  revalidatePath(`/${locale}/admin/community-categories`)
  return { success: true }
}
