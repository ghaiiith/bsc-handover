import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import CompanyRequestCard from '@/components/admin/CompanyRequestCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getCompanyAffiliationRequests,
  parseCompanyRequestFilter,
} from '@/lib/admin/get-company-requests'

interface CompanyRequestsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CompanyRequestsPage({
  searchParams,
}: CompanyRequestsPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const resolved = await searchParams
  const filter = parseCompanyRequestFilter(resolved)
  const { requests, stats } = await getCompanyAffiliationRequests(filter)
  const statuses = ['all', 'pending', 'approved', 'rejected'] as const

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('company_requests_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('company_requests_subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('status_pending'), value: stats.pending },
          { label: t('status_approved'), value: stats.approved },
          { label: t('status_rejected'), value: stats.rejected },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((st) => (
          <Link
            key={st}
            href={
              st === 'pending'
                ? `/${locale}/admin/company-requests`
                : `/${locale}/admin/company-requests?status=${st}`
            }
            className={cn(
              buttonVariants({
                variant: filter === st ? 'default' : 'outline',
                size: 'sm',
              })
            )}
          >
            {t(`filter_${st}`)}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t('no_company_requests')}</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <CompanyRequestCard key={req.id} request={req} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

export const metadata = { title: 'Company Requests — Admin' }
