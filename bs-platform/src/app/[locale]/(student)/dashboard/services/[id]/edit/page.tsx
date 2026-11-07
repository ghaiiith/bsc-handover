import { redirect, notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import Navbar from '@/components/shared/Navbar'
import ServiceForm from '@/components/services/ServiceForm'
import { createClient } from '@/lib/supabase/server'
import { getServiceRevenueNotice } from '@/lib/admin/platform-settings'

interface EditServicePageProps {
  params: Promise<{ id: string }>
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const locale = await getLocale()
  const t = await getTranslations('services')
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .eq('seller_id', user.id)
    .neq('status', 'deleted')
    .single()

  if (!service) notFound()

  const revenueNotice = await getServiceRevenueNotice(locale)

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-8">{t('edit_service')}</h1>
        <ServiceForm locale={locale} service={service} revenueNotice={revenueNotice} />
      </div>
    </div>
  )
}
