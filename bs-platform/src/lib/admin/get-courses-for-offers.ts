'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getCoursesForAdminOffers() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('courses')
    .select('id, title, title_ar')
    .in('status', ['published', 'pending', 'draft'])
    .order('title')

  return data ?? []
}
