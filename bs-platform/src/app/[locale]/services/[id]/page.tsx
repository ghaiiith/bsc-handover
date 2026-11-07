import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { ChevronRight } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import LeadPopupGate from '@/components/tracking/LeadPopupGate'
import ServiceOrderSidebar from '@/components/services/ServiceOrderSidebar'
import ServiceReviews from '@/components/services/ServiceReviews'
import ServicePortfolio from '@/components/services/ServicePortfolio'
import ServiceSellerCard from '@/components/services/ServiceSellerCard'
import ServiceContactSection from '@/components/services/ServiceContactSection'
import StarRating from '@/components/courses/StarRating'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getCategoryLabel } from '@/lib/services/service-utils'
import { getServiceDetail } from '@/lib/services/get-service-detail'

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('services')
  const tNav = await getTranslations('nav')
  const isAr = locale === 'ar'

  const detail = await getServiceDetail(id)
  if (!detail) notFound()

  const { service, seller, reviews, avgRating, reviewCount, orderCount } = detail
  const title = isAr ? service.title_ar : service.title
  const description = isAr ? service.description_ar : service.description

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      {/* Marketing item 6: exit-intent lead capture (admin-switchable). */}
      <LeadPopupGate />

      <div className="container mx-auto px-4 py-6 sm:py-8 pb-sticky-mobile max-w-6xl lg:pb-8">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href={`/${locale}`} className="hover:text-foreground">{tNav('home')}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/${locale}/services`} className="hover:text-foreground">
            {t('browse_title')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground line-clamp-1">{title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          <main className="flex-1 min-w-0 space-y-8">
            <header className="space-y-3">
              <Badge variant="secondary">
                {getCategoryLabel(service.category, locale)}
              </Badge>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <StarRating rating={avgRating} showCount count={reviewCount} />
                <span>{t('orders_count', { count: orderCount })}</span>
              </div>
            </header>

            <ServiceSellerCard
              locale={locale}
              seller={seller}
              avgRating={detail.sellerAvgRating}
              completedOrders={detail.completedOrderCount}
            />

            <Separator />

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t('about_service')}</h2>
              <div className="whitespace-pre-wrap text-muted-foreground">{description}</div>
            </section>

            <ServiceContactSection service={service} />

            <ServicePortfolio
              images={service.portfolio_images ?? []}
              items={service.portfolio_items ?? []}
              locale={locale}
            />

            <ServiceReviews
              locale={locale}
              reviews={reviews}
              avgRating={avgRating}
              reviewCount={reviewCount}
              ratingBreakdown={detail.ratingBreakdown}
            />
          </main>

          <aside className="lg:w-80 shrink-0">
            <ServiceOrderSidebar
              locale={locale}
              service={service}
              isLoggedIn={detail.isLoggedIn}
              isSeller={detail.isSeller}
              activeOrder={detail.activeOrder}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
