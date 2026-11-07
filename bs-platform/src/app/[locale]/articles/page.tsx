import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CalendarDays, Newspaper, User } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { getPublishedArticles } from '@/lib/articles/get-articles'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { formatDate } from '@/lib/utils'

export const revalidate = 120

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'
  return buildPageMetadata({
    locale,
    path: '/articles',
    title: isAr ? 'المقالات' : 'Articles',
    description: isAr ? 'مقالات ومحتوى تحريري من فريق Business Skills' : 'Articles and editorial content from the Business Skills team',
  })
}

/** Round 9 (BS-105): public, searchable-by-URL article index. */
export default async function ArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { page: pageRaw } = await searchParams
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)
  const t = await getTranslations('articles')
  const isAr = locale === 'ar'
  const { articles, total } = await getPublishedArticles(locale, page, 12)
  const totalPages = Math.max(1, Math.ceil(total / 12))

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
            <Newspaper className="mx-auto mb-3 h-10 w-10 opacity-40" />
            {t('empty')}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => {
              const title = (isAr ? a.title_ar : a.title) || a.title
              const summary = (isAr ? a.summary_ar : a.summary) || a.summary
              return (
                <Link key={a.id} href={`/${locale}/articles/${a.slug}`} className="group block">
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                    {a.cover_image_url ? (
                      <div className="relative aspect-[16/9] bg-muted">
                        <Image src={a.cover_image_url} alt={title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Newspaper className="h-10 w-10 text-primary/40" />
                      </div>
                    )}
                    <CardContent className="space-y-2 p-4">
                      <h2 className="line-clamp-2 font-bold leading-snug group-hover:text-primary">{title}</h2>
                      {summary && <p className="line-clamp-3 text-sm text-muted-foreground">{summary}</p>}
                      <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
                        {a.author_name && (
                          <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{a.author_name}</span>
                        )}
                        {a.published_at && (
                          <span className="inline-flex items-center gap-1 num-en"><CalendarDays className="h-3 w-3" />{formatDate(a.published_at, locale)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2 text-sm">
            {page > 1 && (
              <Link href={`/${locale}/articles?page=${page - 1}`} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                {t('prev')}
              </Link>
            )}
            <span className="num-en px-3 py-1.5 text-muted-foreground">{page} / {totalPages}</span>
            {page < totalPages && (
              <Link href={`/${locale}/articles?page=${page + 1}`} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                {t('next')}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
