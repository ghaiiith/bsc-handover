import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowLeft, CalendarDays, User } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import ShareButtons from '@/components/shared/ShareButtons'
import { getPublishedArticle } from '@/lib/articles/get-articles'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { formatDate } from '@/lib/utils'
import { renderArticleBody } from '@/lib/articles/render-body'

export const revalidate = 120

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const a = await getPublishedArticle(slug, locale)
  if (!a) return {}
  const isAr = locale === 'ar'
  return buildPageMetadata({
    locale,
    path: `/articles/${slug}`,
    title: (isAr ? a.title_ar : a.title) || a.title,
    description: ((isAr ? a.summary_ar : a.summary) || a.summary || '').slice(0, 160),
  })
}

/** Round 9 (BS-105): one article at its stable URL. */
export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const a = await getPublishedArticle(slug, locale)
  if (!a) notFound()
  const t = await getTranslations('articles')
  const isAr = locale === 'ar'
  const title = (isAr ? a.title_ar : a.title) || a.title
  const summary = (isAr ? a.summary_ar : a.summary) || a.summary
  const body = (isAr ? a.body_ar : a.body) || a.body
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://bs-platform.com'

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <article className="container mx-auto max-w-3xl px-4 py-8">
        <Link href={`/${locale}/articles`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('back')}
        </Link>

        <header className="mt-4 space-y-3">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          {summary && <p className="text-lg text-muted-foreground">{summary}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {a.author_name && (
              <span className="inline-flex items-center gap-1"><User className="h-4 w-4" />{a.author_name}</span>
            )}
            {a.published_at && (
              <span className="inline-flex items-center gap-1 num-en"><CalendarDays className="h-4 w-4" />{formatDate(a.published_at, locale)}</span>
            )}
          </div>
        </header>

        {a.cover_image_url && (
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
            <Image src={a.cover_image_url} alt={title} fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 768px" />
          </div>
        )}

        <div
          className="article-body mt-8"
          dangerouslySetInnerHTML={{ __html: renderArticleBody(body) }}
        />

        <div className="mt-10 border-t pt-6">
          <ShareButtons url={`${site}/${locale}/articles/${a.slug}`} title={title} />
        </div>
      </article>
    </div>
  )
}
