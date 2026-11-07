import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function CourseNotFound() {
  const locale = await getLocale()
  const t = await getTranslations('courses')

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold mb-2">{t('not_found')}</h1>
      <Link
        href={`/${locale}/courses`}
        className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
      >
        {t('browse_title')}
      </Link>
    </div>
  )
}
