'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Round 9 (BS-105): admin-only article management. Every mutation verifies
 * the caller is an admin before touching the table, independent of RLS.
 */

export interface Article {
  id: string
  slug: string
  title: string
  title_ar: string | null
  summary: string | null
  summary_ar: string | null
  body: string
  body_ar: string | null
  cover_image_url: string | null
  author_id: string | null
  author_name?: string | null
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}

const articleSchema = z.object({
  title: z.string().trim().min(3).max(200),
  title_ar: z.string().trim().max(200).optional().or(z.literal('')),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'invalid_slug'),
  summary: z.string().trim().max(400).optional().or(z.literal('')),
  summary_ar: z.string().trim().max(400).optional().or(z.literal('')),
  body: z.string().max(60_000),
  body_ar: z.string().max(60_000).optional().or(z.literal('')),
  cover_image_url: z.string().trim().url().optional().or(z.literal('')),
})
export type ArticleInput = z.infer<typeof articleSchema>

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await createAdminClient().from('users').select('role').eq('id', user.id).maybeSingle()
  return data?.role === 'admin' ? user.id : null
}

export async function slugify(input: string): Promise<string> {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/[؀-ۿ]+/g, '') // Arabic → dropped; caller supplies a latin slug
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
}

export async function listArticlesForAdmin(): Promise<Article[]> {
  if (!(await requireAdmin())) return []
  const { data } = await createAdminClient()
    .from('articles')
    .select('*, author:users!author_id(full_name)')
    .order('updated_at', { ascending: false })
    .limit(200)
  return (data ?? []).map((r) => {
    const a = Array.isArray(r.author) ? r.author[0] : r.author
    const { author: _drop, ...rest } = r as Record<string, unknown> & { author?: unknown }
    return { ...(rest as unknown as Article), author_name: (a as { full_name?: string } | null)?.full_name ?? null }
  })
}

export async function getArticleForAdmin(id: string): Promise<Article | null> {
  if (!(await requireAdmin())) return null
  const { data } = await createAdminClient().from('articles').select('*').eq('id', id).maybeSingle()
  return (data as Article | null) ?? null
}

function revalidateArticles(locale: string, slug?: string) {
  revalidatePath(`/${locale}/admin/articles`)
  revalidatePath(`/${locale}/articles`)
  revalidatePath(`/en/articles`)
  revalidatePath(`/ar/articles`)
  if (slug) {
    revalidatePath(`/ar/articles/${slug}`)
    revalidatePath(`/en/articles/${slug}`)
  }
}

export async function saveArticle(
  input: ArticleInput,
  locale: string,
  id?: string
): Promise<{ success?: boolean; error?: string; id?: string }> {
  const adminId = await requireAdmin()
  if (!adminId) return { error: 'unauthorized' }

  const parsed = articleSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'validation_failed' }
  const d = parsed.data

  const row = {
    slug: d.slug,
    title: d.title,
    title_ar: d.title_ar || null,
    summary: d.summary || null,
    summary_ar: d.summary_ar || null,
    body: d.body,
    body_ar: d.body_ar || null,
    cover_image_url: d.cover_image_url || null,
    updated_at: new Date().toISOString(),
  }

  const admin = createAdminClient()
  if (id) {
    const { error } = await admin.from('articles').update(row).eq('id', id)
    if (error) return { error: error.code === '23505' ? 'slug_taken' : error.message }
    revalidateArticles(locale, d.slug)
    return { success: true, id }
  }

  const { data, error } = await admin
    .from('articles')
    .insert({ ...row, author_id: adminId, status: 'draft' })
    .select('id')
    .single()
  if (error) return { error: error.code === '23505' ? 'slug_taken' : error.message }
  revalidateArticles(locale, d.slug)
  return { success: true, id: data.id as string }
}

export async function setArticleStatus(
  id: string,
  status: 'draft' | 'published',
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: 'unauthorized' }
  const admin = createAdminClient()
  const { data: existing } = await admin.from('articles').select('slug, published_at').eq('id', id).maybeSingle()
  const { error } = await admin
    .from('articles')
    .update({
      status,
      // First publication stamps the date; unpublish/republish keeps it so the
      // public URL's "published on" stays stable.
      published_at:
        status === 'published' ? (existing?.published_at as string) ?? new Date().toISOString() : existing?.published_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidateArticles(locale, (existing?.slug as string) ?? undefined)
  return { success: true }
}

export async function deleteArticle(id: string, locale: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: 'unauthorized' }
  const admin = createAdminClient()
  const { data: existing } = await admin.from('articles').select('slug').eq('id', id).maybeSingle()
  const { error } = await admin.from('articles').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateArticles(locale, (existing?.slug as string) ?? undefined)
  return { success: true }
}
