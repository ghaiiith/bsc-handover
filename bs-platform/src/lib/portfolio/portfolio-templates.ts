import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/** Report BS-35: reads for the uploaded portfolio templates. */

export interface PortfolioTemplateSummary {
  id: string
  name: string
  name_ar: string | null
  description: string | null
  preview_image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface PortfolioTemplate extends PortfolioTemplateSummary {
  html: string
}

const SUMMARY_COLUMNS =
  'id, name, name_ar, description, preview_image_url, is_active, sort_order, created_at'

/** Active templates, for the user-facing picker. */
export async function listActivePortfolioTemplates(): Promise<PortfolioTemplateSummary[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('portfolio_templates')
    .select(SUMMARY_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return (data as PortfolioTemplateSummary[]) ?? []
}

/** Every template including the disabled ones, for the admin screen. */
export async function listAllPortfolioTemplates(): Promise<PortfolioTemplateSummary[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('portfolio_templates')
    .select(SUMMARY_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return (data as PortfolioTemplateSummary[]) ?? []
}

/** The HTML of one template, only if it is still active. */
export async function getActivePortfolioTemplateHtml(id: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('portfolio_templates')
    .select('html, is_active')
    .eq('id', id)
    .maybeSingle()

  if (!data || !data.is_active) return null
  return (data.html as string) ?? null
}
