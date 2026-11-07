import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

export default async function AdminCouponsRedirectPage() {
  const locale = await getLocale()
  redirect(`/${locale}/admin/discounts`)
}

export const metadata = { title: 'Coupons — Admin' }
