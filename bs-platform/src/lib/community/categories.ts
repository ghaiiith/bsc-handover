import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { COMMUNITY_CATEGORIES } from '@/lib/community/constants'

export interface CommunityCategory {
  value: string
  label: string
  labelEn: string
  emoji: string
  keywords: string[]
}

const FALLBACK: CommunityCategory[] = COMMUNITY_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
  labelEn: c.labelEn,
  emoji: c.emoji,
  keywords: [...c.keywords],
}))

async function fetchCategories(): Promise<CommunityCategory[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('community_categories')
      .select('value, label_ar, label_en, emoji, keywords, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('label_en', { ascending: true })

    if (error || !data || data.length === 0) return FALLBACK

    return data.map((c) => ({
      value: c.value as string,
      label: c.label_ar as string,
      labelEn: c.label_en as string,
      emoji: (c.emoji as string) ?? '',
      keywords: (c.keywords as string[]) ?? [],
    }))
  } catch {
    return FALLBACK
  }
}

/** Admin-editable Community categories (report BS-19), cached with the
 *  `community-categories` tag; falls back to the built-in list on any error. */
export const getCommunityCategories = unstable_cache(fetchCategories, ['community-categories'], {
  revalidate: 300,
  tags: ['community-categories'],
})
