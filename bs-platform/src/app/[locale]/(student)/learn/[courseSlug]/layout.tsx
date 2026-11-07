import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import LessonCurriculumSidebar from '@/components/courses/LessonCurriculumSidebar'
import LearnWorkspaceLayout from '@/components/courses/LearnWorkspaceLayout'
import LearnMobileHeader from '@/components/courses/LearnMobileHeader'
import { LessonPlayerProvider } from '@/components/courses/LessonPlayerProvider'
import { getLessonCourseShell } from '@/lib/courses/get-lesson-course-shell'
import { resolveCourseParam } from '@/lib/courses/resolve-learn-route'
import { getEnrollmentCertStatuses } from '@/lib/certificates/enrollment-cert-status'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LearnCourseLayoutProps {
  children: React.ReactNode
  params: Promise<{ courseSlug: string }>
}

export default async function LearnCourseLayout({
  children,
  params,
}: LearnCourseLayoutProps) {
  const { courseSlug: courseParam } = await params
  const locale = await getLocale()
  const t = await getTranslations('courses')
  const isAr = locale === 'ar'

  const courseRef = await resolveCourseParam(courseParam)
  if (!courseRef) {
    notFound()
  }

  const shellResult = await getLessonCourseShell(courseRef.id)

  if (!shellResult.ok) {
    if (shellResult.reason === 'unauthenticated') {
      redirect(`/${locale}/login`)
    }
    notFound()
  }

  const { data: shell } = shellResult
  const courseTitle = isAr ? shell.course.title_ar : shell.course.title
  const certStatuses = await getEnrollmentCertStatuses(shell.userId, [courseRef.id])
  const certStatus = certStatuses.get(courseRef.id) ?? null

  return (
    <LessonPlayerProvider
      locale={locale}
      courseId={courseRef.id}
      courseSlug={shell.course.slug}
      courseTitle={courseTitle}
      sections={shell.sections}
      initialCompletedLessonIds={shell.completedLessonIds}
      totalLessons={shell.totalLessons}
      certStatus={certStatus}
    >
      <div className="flex h-dvh flex-col overflow-hidden bg-background max-lg:overflow-y-auto lg:bg-muted/20">
        <div className="hidden shrink-0 lg:block">
          <Navbar />
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden max-lg:px-0 max-lg:py-0 lg:container lg:px-4 lg:py-3">
          <div className="hidden shrink-0 lg:block">
            <Link
              href={`/${locale}/courses/${courseRef.id}`}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'mb-2 gap-2 -ms-2'
              )}
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t('back_to_course')}
            </Link>

            <p className="mb-3 truncate text-sm text-muted-foreground">{courseTitle}</p>
          </div>

          <div className="shrink-0 lg:hidden">
            <LearnMobileHeader
              locale={locale}
              courseId={courseRef.id}
              courseTitle={courseTitle}
            />
          </div>

          <LearnWorkspaceLayout curriculum={<LessonCurriculumSidebar />}>
            {children}
          </LearnWorkspaceLayout>
        </div>
      </div>
    </LessonPlayerProvider>
  )
}
