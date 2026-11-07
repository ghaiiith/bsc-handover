import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Download } from 'lucide-react'
import AdminUsersFilters from '@/components/admin/AdminUsersFilters'
import AdminUsersTable from '@/components/admin/AdminUsersTable'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getAdminUsers,
  parseAdminUsersParams,
} from '@/lib/admin/get-admin-users'

interface AdminUsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const resolved = await searchParams
  const filters = parseAdminUsersParams(resolved)
  const result = await getAdminUsers(filters)

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: t('total_users'), value: result.stats.total },
          { label: t('students_count'), value: result.stats.students },
          { label: t('instructors_count'), value: result.stats.instructors },
          { label: t('new_users_this_week'), value: result.stats.newThisWeek },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <AdminUsersFilters
            key={filters.q ?? ''}
            locale={locale}
            params={filters}
          />
        </div>
        <Link
          href={`/${locale}/api/admin/users/export`}
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 shrink-0')}
        >
          <Download className="h-4 w-4" />
          {t('export_csv')}
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <AdminUsersTable locale={locale} users={result.users} />
        </CardContent>
      </Card>

      {result.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {filters.page && filters.page > 1 && (
            <Link
              href={`/${locale}/admin/users?page=${filters.page - 1}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {t('previous_page')}
            </Link>
          )}
          <span className="text-sm text-muted-foreground self-center">
            {filters.page} / {result.totalPages}
          </span>
          {filters.page && filters.page < result.totalPages && (
            <Link
              href={`/${locale}/admin/users?page=${(filters.page ?? 1) + 1}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {t('next_page')}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export const metadata = { title: 'Users — Admin' }
