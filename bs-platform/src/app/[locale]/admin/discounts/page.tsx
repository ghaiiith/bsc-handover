import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getAdminDiscountData } from '@/lib/discounts/queries'
import AdminDiscountsDashboard from '@/components/admin/AdminDiscountsDashboard'

export default async function AdminDiscountsPage() {
  const locale = await getLocale()
  const t = await getTranslations('discounts')
  await requireAdminAccess(locale)

  const data = await getAdminDiscountData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin_dashboard_title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('admin_dashboard_subtitle')}
        </p>
      </div>
      <AdminDiscountsDashboard
        locale={locale}
        activeDiscounts={data.activeDiscounts}
        overview={data.overview}
        coupons={data.coupons as Array<Record<string, unknown>>}
        logs={data.logs as Array<Record<string, unknown>>}
        publishedCourses={data.publishedCourses as Array<{
          id: string
          title: string
          title_ar: string
          price: number
          instructor_id: string | null
        }>}
        maxPercent={100}
        instructors={data.instructors}
        defaultInstructorPct={0}
      />
    </div>
  )
}

export const metadata = { title: 'Discounts — Admin' }
