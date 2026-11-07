import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export interface LandingLead {
  id: string
  full_name: string
  job_title: string | null
  whatsapp: string
  email: string
  company_size: string | null
  locale: string
  created_at: string
  downloaded_at: string | null
}

/** Leads captured by the growth-guide landing page, newest first. */
export async function getLandingLeads(limit = 200): Promise<LandingLead[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('landing_leads')
    .select('id, full_name, job_title, whatsapp, email, company_size, locale, created_at, downloaded_at')
    .eq('source', 'growth_guide')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as LandingLead[]
}
