import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPortfolioSlug, sanitizePortfolioSlugInput } from '@/lib/portfolio/slug-validation'
import { listActivePortfolioTemplates } from '@/lib/portfolio/portfolio-templates'

const settingsSchema = z.object({
  portfolio_is_public: z.boolean().optional(),
  portfolio_slug: z.string().min(3).max(50).optional(),
  // Report BS-35: null puts the portfolio back on the built-in design.
  portfolio_template_id: z.string().uuid().nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // `authenticated` has no column-level SELECT grant on portfolio_template_id
  // (same class of defect as BS-100), so reading it through the session client
  // failed the WHOLE select with 42501 and this route answered 404 for every
  // user. Read the caller's own row through the service role, scoped by id —
  // matching how the PATCH below already writes it.
  const { data, error } = await createAdminClient()
    .from('users')
    .select('portfolio_is_public, portfolio_slug, portfolio_template_id')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    console.error('[portfolio/settings] own-row read failed:', error?.message)
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [{ count: total }, { count: month }] = await Promise.all([
    supabase
      .from('portfolio_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('portfolio_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('viewed_at', thirtyDaysAgo.toISOString()),
  ])

  const { data: profileRow } = await supabase
    .from('users')
    .select('skills, experience, education, projects')
    .eq('id', user.id)
    .single()

  const { count: completedCourses } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', user.id)

  const { data: cvProfile } = await supabase
    .from('cv_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle()

  const templates = await listActivePortfolioTemplates()

  return NextResponse.json({
    portfolio_is_public: data.portfolio_is_public ?? true,
    portfolio_slug: data.portfolio_slug,
    portfolio_template_id: data.portfolio_template_id ?? null,
    templates: templates.map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      name_ar: tpl.name_ar,
      description: tpl.description,
      preview_image_url: tpl.preview_image_url,
    })),
    viewStats: {
      total: total ?? 0,
      thisMonth: month ?? 0,
    },
    checklist: {
      basicInfo: true,
      skillsCount: profileRow?.skills?.length ?? 0,
      experienceCount: Array.isArray(profileRow?.experience) ? profileRow.experience.length : 0,
      educationCount: Array.isArray(profileRow?.education) ? profileRow.education.length : 0,
      projectsCount: Array.isArray(profileRow?.projects) ? profileRow.projects.length : 0,
      completedCoursesCount: completedCourses ?? 0,
      hasDefaultCv: Boolean(cvProfile),
    },
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (parsed.data.portfolio_is_public !== undefined) {
    updates.portfolio_is_public = parsed.data.portfolio_is_public
  }

  if (parsed.data.portfolio_template_id !== undefined) {
    const templateId = parsed.data.portfolio_template_id
    if (templateId) {
      // Only an active template may be selected.
      const active = await listActivePortfolioTemplates()
      if (!active.some((tpl) => tpl.id === templateId)) {
        return NextResponse.json({ error: 'invalid_template' }, { status: 400 })
      }
    }
    updates.portfolio_template_id = templateId
  }

  if (parsed.data.portfolio_slug !== undefined) {
    const cleaned = sanitizePortfolioSlugInput(parsed.data.portfolio_slug)
    if (!isValidPortfolioSlug(cleaned)) {
      return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
    }

    const { data: existing } = await createAdminClient()
      .from('users')
      .select('id')
      .eq('portfolio_slug', cleaned)
      .neq('id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'slug_taken' }, { status: 409 })
    }

    updates.portfolio_slug = cleaned
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  // `authenticated` has no UPDATE grant on public.users, so self-writes go
  // through the service role scoped to the caller's own row.
  const { data, error } = await createAdminClient()
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('portfolio_is_public, portfolio_slug, portfolio_template_id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
