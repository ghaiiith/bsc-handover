import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import CompanyRequestCard from '@/components/admin/CompanyRequestCard'
import FreelancerRequestCard from '@/components/admin/FreelancerRequestCard'
import InstructorRequestCard from '@/components/admin/InstructorRequestCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getRoleRequestsForAdmin,
  parseRoleRequestFilter,
  parseRoleRequestStatus,
  type RoleRequestFilter,
} from '@/lib/admin/get-role-requests'

interface RoleRequestsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const ROLE_FILTERS: RoleRequestFilter[] = ['all', 'instructor', 'company', 'freelancer']
const STATUS_FILTERS = ['pending', 'all', 'approved', 'rejected'] as const

function buildRoleRequestsHref(
  locale: string,
  role: RoleRequestFilter,
  status: (typeof STATUS_FILTERS)[number]
): string {
  const params = new URLSearchParams()
  if (role !== 'all') params.set('role', role)
  if (status !== 'pending') params.set('status', status)
  const query = params.toString()
  return `/${locale}/admin/role-requests${query ? `?${query}` : ''}`
}

export default async function RoleRequestsPage({ searchParams }: RoleRequestsPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const resolved = await searchParams
  const roleFilter = parseRoleRequestFilter(resolved)
  const statusFilter = parseRoleRequestStatus(resolved)
  const { items, stats } = await getRoleRequestsForAdmin(roleFilter, statusFilter)

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('role_requests_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('role_requests_subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('status_pending'), value: stats.totalPending },
          {
            label: t('status_approved'),
            value:
              stats.instructor.approved + stats.company.approved + stats.freelancer.approved,
          },
          {
            label: t('status_rejected'),
            value:
              stats.instructor.rejected + stats.company.rejected + stats.freelancer.rejected,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('role_filter_label')}
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((role) => (
            <Link
              key={role}
              href={buildRoleRequestsHref(locale, role, statusFilter)}
              className={cn(
                buttonVariants({
                  variant: roleFilter === role ? 'default' : 'outline',
                  size: 'sm',
                })
              )}
            >
              {role === 'all' ? t('filter_all') : t(`${role}_requests`)}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((st) => (
          <Link
            key={st}
            href={buildRoleRequestsHref(locale, roleFilter, st)}
            className={cn(
              buttonVariants({
                variant: statusFilter === st ? 'default' : 'outline',
                size: 'sm',
              })
            )}
          >
            {t(`filter_${st}`)}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t('no_role_requests')}</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            if (item.kind === 'instructor') {
              return (
                <InstructorRequestCard
                  key={`instructor-${item.request.id}`}
                  request={item.request}
                  locale={locale}
                />
              )
            }
            if (item.kind === 'company') {
              return (
                <CompanyRequestCard
                  key={`company-${item.request.id}`}
                  request={item.request}
                  locale={locale}
                />
              )
            }
            return (
              <FreelancerRequestCard
                key={`freelancer-${item.request.id}`}
                request={item.request}
                locale={locale}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export const metadata = { title: 'Role Requests — Admin' }
