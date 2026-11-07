import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import MyServiceItem from '@/components/services/MyServiceItem'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { getMyServices } from '@/lib/services/get-my-services'

export default async function MyServicesPage() {
  const locale = await getLocale()
  const t = await getTranslations('services')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { services, stats } = await getMyServices(user.id)

  return (
    <div className="max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold">{t('my_services')}</h1>
          <Link
            href={`/${locale}/dashboard/services/new`}
            className={cn(buttonVariants())}
          >
            <Plus className="h-4 w-4 me-2" />
            {t('add_service')}
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('stat_total_services'), value: stats.totalServices },
            { label: t('stat_active_services'), value: stats.activeServices },
            { label: t('stat_total_orders'), value: stats.totalOrders },
            { label: t('stat_total_earnings'), value: formatPrice(stats.totalEarnings) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {services.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">{t('no_my_services')}</p>
            <Link
              href={`/${locale}/dashboard/services/new`}
              className={cn(buttonVariants())}
            >
              {t('add_first_service')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <MyServiceItem key={service.id} service={service} locale={locale} />
            ))}
          </div>
        )}
    </div>
  )
}
