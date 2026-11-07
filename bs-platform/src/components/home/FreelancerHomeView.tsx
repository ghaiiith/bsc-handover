import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Inbox, Plus, ShoppingBag, Store, Wrench } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import RolePendingBanner from '@/components/home/RolePendingBanner'
import StudentHomeSections from '@/components/home/StudentHomeSections'
import { getDisplayName } from '@/lib/auth/profile'
import { getMyServices } from '@/lib/services/get-my-services'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import type { User } from '@/types'
import type { User as AuthUser } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

interface FreelancerHomeViewProps {
  profile: User
  authUser: AuthUser
  locale: string
  userId: string
}

export default async function FreelancerHomeView({
  profile,
  authUser,
  locale,
  userId,
}: FreelancerHomeViewProps) {
  const t = await getTranslations('personalized_home')
  const displayName = getDisplayName(profile, authUser, locale as 'ar' | 'en')
  const isApproved = profile.role === 'freelancer' || profile.role === 'admin'
  const request = isApproved ? null : await getMyFreelancerRequest(userId)
  const { stats } = isApproved ? await getMyServices(userId) : { stats: null }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-foreground">
          {t('freelancer_welcome', { name: displayName })}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isApproved ? t('freelancer_subtitle') : t('freelancer_home_pending_subtitle')}
        </p>
      </section>

      {!isApproved ? (
        <RolePendingBanner
          title={t('freelancer_pending_title')}
          description={
            request?.status === 'rejected'
              ? t('freelancer_rejected_desc')
              : t('freelancer_pending_desc')
          }
          ctaLabel={t('continue_freelancer_application')}
          ctaHref={`/${locale}/dashboard/become-freelancer`}
        />
      ) : null}

      {isApproved && stats ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t('freelancer_stat_services')}</p>
            <p className="mt-1 text-2xl font-bold">{stats.activeServices}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t('freelancer_stat_orders')}</p>
            <p className="mt-1 text-2xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t('freelancer_stat_earnings')}</p>
            <p className="mt-1 text-2xl font-bold">
              {stats.totalEarnings.toLocaleString(locale === 'ar' ? 'ar-IQ' : 'en-IQ')}
            </p>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('freelancer_workspace_title')}</h2>
        {isApproved && stats && stats.totalServices === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
            <Store className="mx-auto size-10 text-[#E57D17]" />
            <p className="mt-3 font-medium">{t('freelancer_no_services')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('freelancer_no_services_desc')}</p>
            <Link
              href={`/${locale}/dashboard/services/new`}
              className={cn(
                buttonVariants({ variant: 'default' }),
                'mt-4 inline-flex bg-[#E57D17] hover:bg-[#CC6F14]'
              )}
            >
              <Plus className="me-2 size-4" />
              {t('freelancer_create_service')}
            </Link>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={
              isApproved
                ? `/${locale}/dashboard/services/new`
                : `/${locale}/dashboard/become-freelancer`
            }
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#E57D17]/40"
          >
            <Plus className="size-6 text-[#E57D17]" />
            <h3 className="mt-3 font-semibold">{t('freelancer_create_service')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('freelancer_create_service_desc')}</p>
            {!isApproved ? (
              <p className="mt-1 text-xs text-muted-foreground">{t('unlock_after_approval')}</p>
            ) : null}
          </Link>
          <Link
            href={
              isApproved
                ? `/${locale}/dashboard/my-services`
                : `/${locale}/dashboard/become-freelancer`
            }
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#045F6B]/40"
          >
            <Wrench className="size-6 text-[#045F6B]" />
            <h3 className="mt-3 font-semibold">{t('freelancer_manage_services')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('freelancer_manage_services_desc')}</p>
          </Link>
          <Link
            href={
              isApproved
                ? `/${locale}/dashboard/orders/incoming`
                : `/${locale}/dashboard/become-freelancer`
            }
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#045F6B]/40"
          >
            <Inbox className="size-6 text-[#045F6B]" />
            <h3 className="mt-3 font-semibold">{t('freelancer_incoming_orders')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('freelancer_incoming_orders_desc')}</p>
          </Link>
          <Link
            href={`/${locale}/services`}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#045F6B]/40"
          >
            <ShoppingBag className="size-6 text-[#045F6B]" />
            <h3 className="mt-3 font-semibold">{t('freelancer_browse_marketplace')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('freelancer_browse_marketplace_desc')}</p>
          </Link>
        </div>
      </section>

      {!isApproved ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('while_you_wait')}</h2>
          <StudentHomeSections userId={userId} locale={locale} />
        </section>
      ) : null}
    </div>
  )
}
