import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import InstructorRequestCard from '@/components/admin/InstructorRequestCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getInstructorRequests,
  parseInstructorRequestFilter,
} from '@/lib/admin/get-instructor-requests'

interface InstructorRequestsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InstructorRequestsPage({
  searchParams,
}: InstructorRequestsPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const resolved = await searchParams
  const filter = parseInstructorRequestFilter(resolved)
  const { requests, stats } = await getInstructorRequests(filter)

  const statuses = ['all', 'pending', 'approved', 'rejected'] as const

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t('instructor_requests_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('instructor_requests_subtitle')}</p>
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
                ? `/${locale}/admin/instructor-requests`
                : `/${locale}/admin/instructor-requests?status=${st}`
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
        <p className="text-center text-muted-foreground py-12">{t('no_requests')}</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <InstructorRequestCard key={req.id} request={req} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

export const metadata = { title: 'Instructor Requests — Admin' }
