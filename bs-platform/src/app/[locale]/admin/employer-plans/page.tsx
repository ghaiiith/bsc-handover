import { getLocale, getTranslations } from 'next-intl/server'
import { Card, CardContent } from '@/components/ui/card'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { listEmployerPlans } from '@/lib/admin/employer-plan-actions'
import EmployerPlansManager from '@/components/admin/EmployerPlansManager'
import FreeMonthsPanel from '@/components/admin/FreeMonthsPanel'
import { getPlatformSettings } from '@/lib/admin/platform-settings'

export default async function AdminEmployerPlansPage() {
  const locale = await getLocale()
  const t = await getTranslations('employer_plans')
  await requireAdminAccess(locale)

  const [plans, settings] = await Promise.all([listEmployerPlans(), getPlatformSettings()])

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('page_title')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle')}</p>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <EmployerPlansManager locale={locale} plans={plans} />
        </CardContent>
      </Card>
      <FreeMonthsPanel
        locale={locale}
        platformFreeMonths={settings.free_subscription_months}
      />
    </div>
  )
}

export const metadata = { title: 'Employer Plans — Admin' }
