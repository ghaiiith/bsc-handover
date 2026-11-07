import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import FreelancerRequestCard from '@/components/admin/FreelancerRequestCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getFreelancerRequests,
  parseFreelancerRequestFilter,
} from '@/lib/admin/get-freelancer-requests'

interface FreelancerRequestsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FreelancerRequestsPage({
  searchParams,
}: FreelancerRequestsPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const resolved = await searchParams
  const filter = parseFreelancerRequestFilter(resolved)
  const { requests, stats } = await getFreelancerRequests(filter)
  const statuses = ['all', 'pending', 'approved', 'rejected'] as const

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('freelancer_requests_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('freelancer_requests_subtitle')}</p>
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
                ? `/${locale}/admin/freelancer-requests`
                : `/${locale}/admin/freelancer-requests?status=${st}`
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
        <p className="py-12 text-center text-muted-foreground">{t('no_freelancer_requests')}</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <FreelancerRequestCard key={req.id} request={req} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

export const metadata = { title: 'Freelancer Requests — Admin' }
