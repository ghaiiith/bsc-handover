import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { ensureUniqueSlug, generateSlug } from '@/lib/portfolio/generateSlug'

export async function ensurePortfolioSlug(
  userId: string,
  fullName: string,
  fullNameAr?: string | null
): Promise<string | null> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('users')
    .select('portfolio_slug')
    .eq('id', userId)
    .single()

  if (existing?.portfolio_slug) {
    return existing.portfolio_slug
  }

  const base = generateSlug(fullNameAr || fullName, fullName)
  const unique = await ensureUniqueSlug(base, supabase)

  const { error } = await supabase
    .from('users')
    .update({ portfolio_slug: unique })
    .eq('id', userId)
    .is('portfolio_slug', null)

  if (error) {
    return null
  }

  return unique
}
