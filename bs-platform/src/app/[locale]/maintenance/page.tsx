import { getTranslations } from 'next-intl/server'
import { Wrench } from 'lucide-react'

interface MaintenancePageProps {
  params: Promise<{ locale: string }>
}

export default async function MaintenancePage({ params }: MaintenancePageProps) {
  const { locale } = await params
  const t = await getTranslations('admin')
  const isAr = locale === 'ar'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-muted/30">
      <Wrench className="h-16 w-16 text-muted-foreground mb-6" />
      <h1 className="text-2xl font-bold mb-2">{t('maintenance_title')}</h1>
      <p className="text-muted-foreground max-w-md">
        {isAr ? t('maintenance_message') : t('maintenance_message')}
      </p>
    </div>
  )
}
