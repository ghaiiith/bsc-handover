import { getLocale, getTranslations } from 'next-intl/server'
import PageHeader from '@/components/dashboard/ux/PageHeader'
import InstructorDiscountsManager from '@/components/discounts/InstructorDiscountsManager'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getInstructorDiscountData } from '@/lib/discounts/queries'
import { getInstructorCommissionSplit } from '@/lib/admin/platform-settings'

export default async function InstructorDiscountsPage() {
  const locale = await getLocale()
  const t = await getTranslations('discounts')
  const { userId } = await requireInstructorAccess(locale)

  const [data, split] = await Promise.all([
    getInstructorDiscountData(userId),
    getInstructorCommissionSplit(userId),
  ])

  const instructorPct = split?.instructorPct ?? 0

  return (
    <>
      <PageHeader title={t('title')} description={t('instructor_share')} />
      <InstructorDiscountsManager
        locale={locale}
        courses={data.courses}
        coupons={data.coupons}
        history={data.history}
        maxPercent={instructorPct}
      />
    </>
  )
}
