import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { BookOpen, Briefcase, GraduationCap } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import ContinueLearningCard from '@/components/dashboard/ux/ContinueLearningCard'
import { getStudentWorkflowData } from '@/lib/dashboard/get-student-workflow'
import { cn } from '@/lib/utils'

interface StudentHomeSectionsProps {
  userId: string
  locale: string
}

export default async function StudentHomeSections({
  userId,
  locale,
}: StudentHomeSectionsProps) {
  const t = await getTranslations('personalized_home')
  const workflow = await getStudentWorkflowData(userId, locale)

  return (
    <div className="space-y-6">
      {workflow.continueCourse ? (
        <ContinueLearningCard
          locale={locale}
          courseTitle={workflow.continueCourse.courseTitle}
          courseSlug={workflow.continueCourse.courseSlug}
          thumbnailUrl={workflow.continueCourse.thumbnailUrl}
          progressPercent={workflow.continueCourse.progressPercent}
          completedLessons={workflow.continueCourse.completedLessons}
          totalLessons={workflow.continueCourse.totalLessons}
          continueLessonSlug={workflow.continueCourse.continueLessonSlug}
          ctaLabel={t('browse_courses')}
          progressLabel={t('my_learning')}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <BookOpen className="mx-auto size-10 text-[#E57D17]" />
          <p className="mt-3 font-medium">{t('no_courses_yet')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('start_first_course')}</p>
          <Link
            href={`/${locale}/courses`}
            className={cn(
              buttonVariants({ variant: 'default' }),
              'mt-4 inline-flex bg-[#E57D17] hover:bg-[#CC6F14]'
            )}
          >
            {t('browse_courses')}
          </Link>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/${locale}/dashboard/my-courses`}
          className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#045F6B]/40"
        >
          <GraduationCap className="size-6 text-[#045F6B]" />
          <h2 className="mt-3 font-semibold">{t('my_learning')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('my_learning_desc')}</p>
        </Link>
        <Link
          href={`/${locale}/jobs`}
          className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#045F6B]/40"
        >
          <Briefcase className="size-6 text-[#045F6B]" />
          <h2 className="mt-3 font-semibold">{t('explore_jobs')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('explore_jobs_desc')}</p>
        </Link>
      </section>
    </div>
  )
}
