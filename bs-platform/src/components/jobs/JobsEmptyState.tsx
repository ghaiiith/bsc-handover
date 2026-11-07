import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Briefcase } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface JobsEmptyStateProps {
  locale: string
  showClearFilters?: boolean
}

export default async function JobsEmptyState({
  locale,
  showClearFilters,
}: JobsEmptyStateProps) {
  const t = await getTranslations('jobs')

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium">{t('no_jobs')}</p>
      {showClearFilters && (
        <Link
          href={`/${locale}/jobs`}
          className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
        >
          {t('clear_filters')}
        </Link>
      )}
    </div>
  )
}
