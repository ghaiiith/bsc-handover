import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ShoppingBag } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ServicesEmptyStateProps {
  locale: string
  showClearFilters?: boolean
}

export default async function ServicesEmptyState({
  locale,
  showClearFilters,
}: ServicesEmptyStateProps) {
  const t = await getTranslations('services')

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium">{t('no_services')}</p>
      {showClearFilters && (
        <Link
          href={`/${locale}/services`}
          className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
        >
          {t('clear_filters')}
        </Link>
      )}
    </div>
  )
}
