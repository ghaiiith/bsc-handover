'use client'

import { createClient } from '@/lib/supabase/client'

/** Refresh the browser session so updated app_metadata claims are picked up. */
export async function refreshAuthSession(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.refreshSession()
    return !error && Boolean(data.session)
  } catch {
    return false
  }
}
