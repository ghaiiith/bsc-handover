import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import CourseCard from '@/components/courses/CourseCard'
import { buttonVariants } from '@/components/ui/button'
import { getUserWishlist } from '@/lib/courses/get-wishlist'
import { cn } from '@/lib/utils'

export default async function WishlistPage() {
  const locale = await getLocale()
  const t = await getTranslations('courses')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const items = await getUserWishlist(user.id)

  return (
    <>
      <div className="mb-8">
          <h1 className="text-2xl font-bold">{t('wishlist_title')}</h1>
          <p className="text-muted-foreground mt-1">{t('wishlist_subtitle')}</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <Heart className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-4 font-medium">{t('wishlist_empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('wishlist_empty_subtitle')}</p>
            <Link
              href={`/${locale}/courses`}
              className={cn(buttonVariants({ className: 'mt-6' }))}
            >
              {t('browse_courses')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <CourseCard key={item.wishlistId} course={item.course} locale={locale} />
            ))}
          </div>
        )}
    </>
  )
}
