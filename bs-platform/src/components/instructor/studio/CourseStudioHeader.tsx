import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Eye, ExternalLink, Clock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Course } from '@/types'

interface CourseStudioHeaderProps {
  locale: string
  course: Course
  title?: string
  subtitle?: string
}

export default async function CourseStudioHeader({
  locale,
  course,
  title,
  subtitle,
}: CourseStudioHeaderProps) {
  const t = await getTranslations('studio')
  const isAr = locale === 'ar'
  const courseTitle = isAr ? course.title_ar : course.title

  // Report BS-75: the trainer must clearly see that an edit is awaiting review
  // (the approved version stays live meanwhile), or that it was rejected + why.
  const pending = course.pending_review_status === 'pending'
  const rejected = course.pending_review_status === 'rejected'

  return (
    <>
    {(pending || rejected) && (
      <div
        className={cn(
          'flex items-start gap-2 border-b px-4 py-3 text-sm md:px-6',
          pending
            ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
            : 'bg-destructive/10 text-destructive'
        )}
      >
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">
            {pending ? t('edit_pending_title') : t('edit_rejected_title')}
          </p>
          <p className="text-xs opacity-90">
            {pending
              ? t('edit_pending_hint')
              : course.pending_rejection_reason || t('edit_rejected_title')}
          </p>
        </div>
      </div>
    )}
    <header className="flex flex-col gap-3 border-b bg-background/80 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between md:px-6">
      <div className="min-w-0">
        {title ? (
          <>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{courseTitle}</p>
            <h1 className="text-xl font-bold tracking-tight">{t('workspace_title')}</h1>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/${locale}/courses/${course.id}`}
          target="_blank"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <Eye className="h-3.5 w-3.5" />
          {t('preview')}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Link>
      </div>
    </header>
    </>
  )
}
