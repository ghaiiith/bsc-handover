import { notFound, redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import ServiceOrderDetailView from '@/components/services/ServiceOrderDetail'
import { createClient } from '@/lib/supabase/server'
import { getServiceOrderDetail } from '@/lib/services/get-orders'

interface ServiceOrderPageProps {
  params: Promise<{ orderId: string }>
}

export default async function ServiceOrderDetailPage({
  params,
}: ServiceOrderPageProps) {
  const { orderId } = await params
  const locale = await getLocale()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/login`)

  const order = await getServiceOrderDetail(orderId, user.id, locale)
  if (!order) notFound()

  return (
    <div className="max-w-4xl">
      <ServiceOrderDetailView order={order} locale={locale} />
    </div>
  )
}
