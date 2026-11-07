import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Building2, Search, Users } from 'lucide-react'
import RolePendingBanner from '@/components/home/RolePendingBanner'
import StudentHomeSections from '@/components/home/StudentHomeSections'
import { getDisplayName } from '@/lib/auth/profile'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import type { User } from '@/types'
import type { User as AuthUser } from '@supabase/supabase-js'

interface CompanyHomeViewProps {
  profile: User
  authUser: AuthUser
  locale: string
  userId: string
}

export default async function CompanyHomeView({
  profile,
  authUser,
  locale,
  userId,
}: CompanyHomeViewProps) {
  const t = await getTranslations('personalized_home')
  const isApproved = profile.role === 'company' || profile.role === 'admin'
  const request = isApproved ? null : await getMyCompanyAffiliationRequest(userId)
  const displayName = getDisplayName(profile, authUser, locale as 'ar' | 'en')
  const companyLabel =
    locale === 'ar'
      ? request?.company_name_ar ?? request?.company_name
      : request?.company_name

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-foreground">
          {isApproved ? t('company_welcome') : t('welcome', { name: displayName })}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isApproved ? t('company_subtitle') : t('company_home_pending_subtitle')}
        </p>
        {companyLabel ? (
          <p className="mt-1 text-sm font-medium text-foreground">
            {t('your_company', { name: companyLabel })}
          </p>
        ) : null}
      </section>

      {!isApproved ? (
        <RolePendingBanner
          title={t('company_pending_title')}
          description={
            request?.status === 'rejected'
              ? t('company_rejected_desc')
              : t('company_pending_desc')
          }
          ctaLabel={t('continue_company_application')}
          ctaHref={`/${locale}/dashboard/company-affiliation`}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('company_workspace_title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={
              isApproved
                ? `/${locale}/dashboard/company-jobs/new`
                : `/${locale}/dashboard/company-affiliation`
            }
            className="rounded-xl border border-border bg-card p-5 hover:border-[#E57D17]/40"
          >
            <Building2 className="size-6 text-[#E57D17]" />
            <h3 className="mt-3 font-semibold">{t('post_job')}</h3>
            {!isApproved ? (
              <p className="mt-1 text-xs text-muted-foreground">{t('unlock_after_approval')}</p>
            ) : null}
          </Link>
          <Link
            href={
              isApproved
                ? `/${locale}/dashboard/company-jobs`
                : `/${locale}/dashboard/company-affiliation`
            }
            className="rounded-xl border border-border bg-card p-5 hover:border-[#045F6B]/40"
          >
            <Users className="size-6 text-[#045F6B]" />
            <h3 className="mt-3 font-semibold">{t('manage_jobs')}</h3>
            {!isApproved ? (
              <p className="mt-1 text-xs text-muted-foreground">{t('unlock_after_approval')}</p>
            ) : null}
          </Link>
          <Link
            href={`/${locale}/jobs`}
            className="rounded-xl border border-border bg-card p-5 hover:border-[#045F6B]/40 sm:col-span-2"
          >
            <Search className="size-6 text-[#045F6B]" />
            <h3 className="mt-3 font-semibold">{t('find_candidates')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('find_candidates_desc')}</p>
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
