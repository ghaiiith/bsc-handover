import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import AdminServicesTable from '@/components/admin/AdminServicesTable'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import {
  getAdminServices,
  parseAdminServicesParams,
} from '@/lib/admin/get-admin-services'

interface AdminServicesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminServicesPage({
  searchParams,
}: AdminServicesPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('admin')
  await requireAdminAccess(locale)

  const resolved = await searchParams
  const filters = parseAdminServicesParams(resolved)
  const { services, stats } = await getAdminServices(filters)

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">{t('services_subtitle')}</p>
        <Link
          href={`/${locale}/admin/services/new`}
          className={cn(buttonVariants(), 'gap-2 shrink-0')}
        >
          <Plus className="h-4 w-4" />
          {t('create_service')}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('services_active'), value: stats.active },
          { label: t('services_paused'), value: stats.paused },
          { label: t('services_total_orders'), value: stats.totalOrders },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <AdminServicesTable locale={locale} services={services} />
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = { title: 'Services — Admin' }
