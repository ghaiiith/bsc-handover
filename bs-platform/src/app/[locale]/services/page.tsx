import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'
import Navbar from '@/components/shared/Navbar'
import ServiceCard from '@/components/services/ServiceCard'
import ServicesFilters from '@/components/services/ServicesFilters'
import ServicesPagination from '@/components/services/ServicesPagination'
import ServicesEmptyState from '@/components/services/ServicesEmptyState'
import {
  getCachedActiveServices,
  hasActiveServiceFilters,
  parseServiceListParams,
} from '@/lib/services/list-services'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isAr = locale === 'ar'

  return buildPageMetadata({
    locale,
    path: '/services',
    title: isAr ? `سوق الخدمات` : `Services`,
    description: isAr
      ? 'تصفح خدمات مهنية من خبراء عراقيين أو قدّم خدماتك الخاصة'
      : 'Browse professional services from Iraqi experts or offer your own',
  })
}

interface ServicesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('services')
  const resolvedParams = await searchParams
  const filters = parseServiceListParams(resolvedParams)
  const result = await getCachedActiveServices(filters)

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('browse_title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('services_count', { count: result.total })}
          </p>
        </div>

        {result.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
            {t('load_error')}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full shrink-0 lg:w-64">
              <div className="max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none lg:sticky lg:top-20 rounded-xl border bg-background p-4 shadow-sm">
                <ServicesFilters locale={locale} params={filters} />
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              {result.services.length === 0 ? (
                <ServicesEmptyState
                  locale={locale}
                  showClearFilters={hasActiveServiceFilters(filters)}
                />
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {result.services.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        locale={locale}
                      />
                    ))}
                  </div>
                  <ServicesPagination
                    locale={locale}
                    params={filters}
                    page={result.page}
                    totalPages={result.totalPages}
                  />
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  )
}
