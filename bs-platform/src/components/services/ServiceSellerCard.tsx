import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import StarRating from '@/components/courses/StarRating'
import { cn, formatDate } from '@/lib/utils'
import type { User } from '@/types'

interface ServiceSellerCardProps {
  locale: string
  seller: User
  avgRating: number
  completedOrders: number
}

export default async function ServiceSellerCard({
  locale,
  seller,
  avgRating,
  completedOrders,
}: ServiceSellerCardProps) {
  const t = await getTranslations('services')
  const isAr = locale === 'ar'
  const sellerName = isAr ? seller.full_name_ar ?? seller.full_name : seller.full_name
  const bio = isAr ? seller.bio_ar ?? seller.bio : seller.bio

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={seller.avatar_url ?? ''} />
          <AvatarFallback>{sellerName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-lg">{sellerName}</p>
          <p className="text-sm text-muted-foreground">
            {t('member_since', { date: formatDate(seller.created_at, locale) })}
          </p>
        </div>
      </div>
      {bio && <p className="text-sm text-muted-foreground">{bio}</p>}
      <div className="flex gap-4 text-sm items-center">
        <StarRating rating={avgRating} />
        <span>{t('completed_orders', { count: completedOrders })}</span>
      </div>
      <Link
        href={`/${locale}/sellers/${seller.id}`}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        {t('seller_profile')}
      </Link>
    </div>
  )
}
