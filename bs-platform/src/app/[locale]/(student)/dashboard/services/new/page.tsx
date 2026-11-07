import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import Navbar from '@/components/shared/Navbar'
import ServiceForm from '@/components/services/ServiceForm'
import { createClient } from '@/lib/supabase/server'
import { getServiceRevenueNotice } from '@/lib/admin/platform-settings'

export default async function NewServicePage() {
  const locale = await getLocale()
  const t = await getTranslations('services')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const revenueNotice = await getServiceRevenueNotice(locale)

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-8">{t('add_service')}</h1>
        <ServiceForm locale={locale} revenueNotice={revenueNotice} />
      </div>
    </div>
  )
}
