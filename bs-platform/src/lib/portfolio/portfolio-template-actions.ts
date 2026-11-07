'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_TEMPLATE_BYTES, sanitizeTemplateHtml } from '@/lib/portfolio/template-sanitize'

/** Report BS-35: admin management of the uploaded portfolio templates. */

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user.id : null
}

export async function createPortfolioTemplate(input: {
  name: string
  name_ar?: string
  description?: string
  html: string
  locale: string
}) {
  const adminId = await requireAdmin()
  if (!adminId) return { error: 'unauthorized' }

  const name = input.name.trim()
  if (name.length < 2 || name.length > 120) return { error: 'invalid_name' }

  const html = input.html.trim()
  if (html.length < 20) return { error: 'empty_template' }
  if (Buffer.byteLength(html, 'utf8') > MAX_TEMPLATE_BYTES) return { error: 'template_too_large' }

  const admin = createAdminClient()
  const { error } = await admin.from('portfolio_templates').insert({
    name,
    name_ar: input.name_ar?.trim() || null,
    description: input.description?.trim().slice(0, 500) || null,
    html: sanitizeTemplateHtml(html),
    created_by: adminId,
  })

  if (error) return { error: error.message }

  revalidatePath(`/${input.locale}/admin/portfolio-templates`)
  return { success: true }
}

export async function setPortfolioTemplateActive(
  id: string,
  isActive: boolean,
  locale: string
) {
  if (!(await requireAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('portfolio_templates')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/${locale}/admin/portfolio-templates`)
  return { success: true }
}

/**
 * Disabling hides a template from the picker; deleting it also detaches every
 * portfolio still pointing at it (the FK is ON DELETE SET NULL, so those
 * portfolios fall back to the built-in design rather than 404ing).
 */
export async function deletePortfolioTemplate(id: string, locale: string) {
  if (!(await requireAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin.from('portfolio_templates').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/${locale}/admin/portfolio-templates`)
  return { success: true }
}
