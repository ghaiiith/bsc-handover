import Link from 'next/link'
import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import Navbar from '@/components/shared/Navbar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import StarRating from '@/components/courses/StarRating'
import DiscountCountdown from '@/components/discounts/DiscountCountdown'
import { getCourseCategories } from '@/lib/admin/categories'
import { getOfferCourses, hasPlatformWideSale } from '@/lib/discounts/queries'
import { formatPrice } from '@/lib/utils'
import { BookOpen } from 'lucide-react'

export const revalidate = 300

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('offers')
  const isAr = locale === 'ar'
  const params = await searchParams

  const sort = typeof params.sort === 'string' ? params.sort : 'highest_discount'
  const category = typeof params.category === 'string' ? params.category : undefined
  const minDiscount = Number(params.minDiscount) || 0

  const validSorts = ['highest_discount', 'ending_soon', 'cheapest', 'rating'] as const
  const sortKey = validSorts.includes(sort as (typeof validSorts)[number])
    ? (sort as (typeof validSorts)[number])
    : 'highest_discount'

  const [courses, platformSale, courseCategories] = await Promise.all([
    getOfferCourses({
      minDiscount: minDiscount > 0 ? minDiscount : 1,
      category,
      sort: sortKey,
    }),
    hasPlatformWideSale(),
    getCourseCategories(),
  ])

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        {platformSale.active && platformSale.ends_at && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
            <p className="font-semibold">🎉 {t('platform_sale')}</p>
            <DiscountCountdown endsAt={platformSale.ends_at} className="justify-center" />
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { key: 'highest_discount', label: t('highest_discount') },
            { key: 'ending_soon', label: t('ending_soon') },
            { key: 'cheapest', label: t('final_price') },
          ].map((item) => (
            <Link
              key={item.key}
              href={`/${locale}/offers?sort=${item.key}${category ? `&category=${category}` : ''}`}
            >
              <Button
                variant={sortKey === item.key ? 'default' : 'outline'}
                size="sm"
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {courseCategories.map((cat) => (
            <Link
              key={cat.value}
              href={`/${locale}/offers?category=${cat.value}&sort=${sortKey}`}
            >
              <Badge variant={category === cat.value ? 'default' : 'secondary'}>
                {isAr ? cat.label : cat.labelEn}
              </Badge>
            </Link>
          ))}
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-lg text-muted-foreground">{t('no_offers')}</p>
            <Link
              href={`/${locale}/courses`}
              className={buttonVariants()}
            >
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const title = isAr ? course.title_ar : course.title
              const hasSale = course.pricing.total_discount_pct > 0

              return (
                <Link key={course.id} href={`/${locale}/courses/${course.id}`}>
                  <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative aspect-video bg-muted">
                      {course.thumbnail_url ? (
                        <Image
                          src={course.thumbnail_url}
                          alt={title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      {hasSale && (
                        <Badge className="absolute top-2 start-2 bg-emerald-600">
                          {Math.round(course.pricing.total_discount_pct)}% {t('savings')}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold line-clamp-2">{title}</h3>
                      <StarRating rating={course.avg_rating} />
                      <div className="flex items-baseline gap-2">
                        {hasSale && (
                          <span className="text-sm line-through text-muted-foreground">
                            {formatPrice(course.pricing.original_price)}
                          </span>
                        )}
                        <span className="text-xl font-bold text-orange-600">
                          {formatPrice(course.pricing.final_price)}
                        </span>
                      </div>
                      {course.ends_at && (
                        <DiscountCountdown endsAt={course.ends_at} />
                      )}
                      <Button className="w-full" size="sm">
                        {t('get_now')}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
