'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseFeaturedUserIds } from '@/lib/community/community-settings'

const MAX_FEATURED = 10

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

async function upsertSetting(key: string, value: string) {
  const admin = createAdminClient()
  await admin
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

export async function updateCommunityVisibility(enabled: boolean, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }
  await upsertSetting('community_visible', enabled ? 'true' : 'false')
  revalidateTag('community-settings', 'max')
  revalidateTag('community-members', 'max')
  revalidatePath(`/${locale}/community`)
  revalidatePath(`/${locale}/admin/community`)
  return { success: true }
}

export async function addFeaturedCommunityUser(userId: string, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: setting } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'community_featured_users')
    .maybeSingle()

  const ids = parseFeaturedUserIds(setting?.value ?? '[]')
  if (ids.length >= MAX_FEATURED) return { error: 'max_featured' }
  if (ids.includes(userId)) return { error: 'already_featured' }

  await upsertSetting('community_featured_users', JSON.stringify([...ids, userId]))
  revalidateTag('community-settings', 'max')
  revalidateTag('community-members', 'max')
  revalidatePath(`/${locale}/community`)
  revalidatePath(`/${locale}/admin/community`)
  return { success: true }
}

export async function removeFeaturedCommunityUser(userId: string, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: setting } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'community_featured_users')
    .maybeSingle()

  const ids = parseFeaturedUserIds(setting?.value ?? '[]').filter((id) => id !== userId)
  await upsertSetting('community_featured_users', JSON.stringify(ids))
  revalidateTag('community-settings', 'max')
  revalidateTag('community-members', 'max')
  revalidatePath(`/${locale}/community`)
  revalidatePath(`/${locale}/admin/community`)
  return { success: true }
}
