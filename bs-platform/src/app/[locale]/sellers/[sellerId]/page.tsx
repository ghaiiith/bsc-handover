import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import Navbar from '@/components/shared/Navbar'
import ServiceCard from '@/components/services/ServiceCard'
import StarRating from '@/components/courses/StarRating'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSellerProfile } from '@/lib/services/get-seller-profile'
import { formatDate } from '@/lib/utils'

interface SellerProfilePageProps {
  params: Promise<{ sellerId: string }>
}

export default async function SellerProfilePage({ params }: SellerProfilePageProps) {
  const locale = await getLocale()
  const t = await getTranslations('services')
  const { sellerId } = await params
  const data = await getSellerProfile(sellerId)

  if (!data) notFound()

  const { seller, services, reviews, avgRating, completedOrders } = data
  const isAr = locale === 'ar'
  const name = isAr ? seller.full_name_ar ?? seller.full_name : seller.full_name

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 rounded-xl border bg-card p-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={seller.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl">{name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-start space-y-2 flex-1">
            <h1 className="text-2xl font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {t('member_since', { date: formatDate(seller.created_at, locale) })}
            </p>
            {seller.bio && (
              <p className="text-sm text-muted-foreground max-w-xl">{seller.bio}</p>
            )}
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm">
              {avgRating > 0 && (
                <span className="flex items-center gap-1">
                  <StarRating rating={avgRating} />
                  ({avgRating.toFixed(1)})
                </span>
              )}
              <span>{t('completed_orders', { count: completedOrders })}</span>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('seller_services')}</h2>
          {services.length === 0 ? (
            <p className="text-muted-foreground">{t('no_services')}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} locale={locale} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('recent_reviews')}</h2>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground">{t('no_reviews')}</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const reviewerName = isAr
                  ? review.reviewer?.full_name_ar ?? review.reviewer?.full_name
                  : review.reviewer?.full_name
                const svcTitle = isAr
                  ? review.service?.title_ar
                  : review.service?.title
                return (
                  <div key={review.id} className="rounded-lg border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={review.reviewer?.avatar_url ?? undefined} />
                        <AvatarFallback>{reviewerName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{reviewerName}</p>
                        <p className="text-xs text-muted-foreground">{svcTitle}</p>
                      </div>
                      <div className="ms-auto">
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(review.created_at, locale)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
