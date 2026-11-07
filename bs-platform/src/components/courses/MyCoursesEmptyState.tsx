import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { BookOpen } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MyCoursesEmptyStateProps {
  locale: string
}

export default async function MyCoursesEmptyState({ locale }: MyCoursesEmptyStateProps) {
  const t = await getTranslations('courses')

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 px-6 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{t('no_enrollments')}</h3>
      <Link
        href={`/${locale}/courses`}
        className={cn(buttonVariants(), 'mt-4')}
      >
        {t('browse_courses')}
      </Link>
    </div>
  )
}
