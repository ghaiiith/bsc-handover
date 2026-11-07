import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Article } from '@/lib/articles/article-actions'

/** Round 9 (BS-105): public reads — published only, cached briefly. */

export interface PublicArticle extends Article {
  author_name: string | null
}

const SELECT = 'id, slug, title, title_ar, summary, summary_ar, body, body_ar, cover_image_url, author_id, status, published_at, created_at, updated_at, author:users!author_id(full_name, full_name_ar)'

function shape(r: Record<string, unknown>, locale: string): PublicArticle {
  const a = (Array.isArray(r.author) ? r.author[0] : r.author) as { full_name?: string; full_name_ar?: string } | null
  const { author: _drop, ...rest } = r
  return {
    ...(rest as unknown as Article),
    author_name: (locale === 'ar' ? a?.full_name_ar : a?.full_name) || a?.full_name || null,
  }
}

async function loadList(locale: string, page: number, pageSize: number) {
  const admin = createAdminClient()
  const from = (page - 1) * pageSize
  const { data, count } = await admin
    .from('articles')
    .select(SELECT, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, from + pageSize - 1)
  return {
    articles: (data ?? []).map((r) => shape(r as Record<string, unknown>, locale)),
    total: count ?? 0,
  }
}

export function getPublishedArticles(locale: string, page = 1, pageSize = 12) {
  return unstable_cache(() => loadList(locale, page, pageSize), ['articles', locale, String(page), String(pageSize)], {
    revalidate: 120,
    tags: ['articles'],
  })()
}

async function loadOne(slug: string, locale: string): Promise<PublicArticle | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('articles').select(SELECT).eq('slug', slug).eq('status', 'published').maybeSingle()
  return data ? shape(data as Record<string, unknown>, locale) : null
}

export function getPublishedArticle(slug: string, locale: string) {
  return unstable_cache(() => loadOne(slug, locale), ['article', slug, locale], {
    revalidate: 120,
    tags: ['articles', `article-${slug}`],
  })()
}
