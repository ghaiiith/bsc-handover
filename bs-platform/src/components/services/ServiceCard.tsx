'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import StarRating from '@/components/courses/StarRating'
import { formatPrice } from '@/lib/utils'
import {
  getCategoryGradient,
  getCategoryLabel,
} from '@/lib/services/service-utils'
import type { ServiceListItem } from '@/lib/services/list-services'

interface ServiceCardProps {
  service: ServiceListItem
  locale: string
}

export default function ServiceCard({ service, locale }: ServiceCardProps) {
  const t = useTranslations('services')
  const isAr = locale === 'ar'
  const title = isAr ? service.title_ar : service.title
  const description = isAr ? service.description_ar : service.description
  const sellerName = isAr
    ? service.seller?.full_name_ar ?? service.seller?.full_name
    : service.seller?.full_name
  const portfolioImage = service.portfolio_images?.[0]
  const gradient = getCategoryGradient(service.category)

  return (
    <Link href={`/${locale}/services/${service.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className={`relative aspect-video w-full bg-gradient-to-br ${gradient}`}>
          {portfolioImage ? (
            <Image
              src={portfolioImage}
              alt={title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : null}
          <div className="absolute top-2 start-2">
            <Badge variant="secondary" className="bg-background/90">
              {getCategoryLabel(service.category, locale)}
            </Badge>
          </div>
        </div>

        <CardContent className="space-y-3 p-4">
          {service.seller && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={service.seller.avatar_url ?? ''} />
                <AvatarFallback className="text-[10px]">
                  {service.seller.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {sellerName}
              </span>
            </div>
          )}

          <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
            {title}
          </h3>

          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('delivered_in')} {service.delivery_days} {t('days')}
            </span>
            <StarRating
              rating={service.avg_rating}
              showCount
              count={service.review_count}
            />
          </div>

          <p className="font-bold text-primary pt-1">
            {t('starting_at')} {formatPrice(service.price)}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
