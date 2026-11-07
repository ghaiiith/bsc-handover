import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import LessonVideoPlayer from '@/components/courses/LessonVideoPlayer'
import LessonDocumentViewer from '@/components/courses/LessonDocumentViewer'
import LessonQuizPlayer from '@/components/courses/LessonQuizPlayer'
import LessonNavigation from '@/components/courses/LessonNavigation'
import LessonLearningSidebar from '@/components/courses/LessonLearningSidebar'
import LessonMobileActionBar, {
  LessonMobileInfo,
} from '@/components/courses/LessonMobileActionBar'
import { getLessonCourseShell } from '@/lib/courses/get-lesson-course-shell'
import { getLessonContent } from '@/lib/courses/get-lesson-content'
import { getLessonQuizForStudent } from '@/lib/courses/get-lesson-quiz'
import { resolveLearnRoute } from '@/lib/courses/resolve-learn-route'
import LessonContentDisplay from '@/components/courses/LessonContentDisplay'

interface LessonPlayerPageProps {
  params: Promise<{ courseSlug: string; lessonSlug: string }>
  searchParams: Promise<{ tab?: string; thread?: string }>
}

export default async function LessonPlayerPage({ params, searchParams }: LessonPlayerPageProps) {
  const { courseSlug: courseParam, lessonSlug: lessonParam } = await params
  const { tab: tabParam, thread: threadParam } = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('courses')
  const isAr = locale === 'ar'

  const route = await resolveLearnRoute(locale, courseParam, lessonParam)
  if (!route.ok) {
    notFound()
  }

  if (route.redirectTo) {
    redirect(route.redirectTo)
  }

  const { courseId, lessonId } = route

  const shellResult = await getLessonCourseShell(courseId)
  if (!shellResult.ok) {
    if (shellResult.reason === 'unauthenticated') {
      redirect(`/${locale}/login`)
    }
    notFound()
  }

  const contentResult = await getLessonContent(courseId, lessonId, {
    sections: shellResult.data.sections,
    isInstructor: shellResult.data.isInstructor,
    isAdmin: shellResult.data.isAdmin,
    userId: shellResult.data.userId,
  })

  if (!contentResult.ok) {
    if (contentResult.reason === 'unauthorized') {
      redirect(`/${locale}/courses/${courseId}`)
    }
    notFound()
  }

  const { currentLesson } = contentResult.data
  const lessonTitle = isAr ? currentLesson.title_ar : currentLesson.title
  const courseTitle = isAr ? shellResult.data.course.title_ar : shellResult.data.course.title
  const isLessonCompleted = shellResult.data.completedLessonIds.includes(lessonId)
  const lessonType = currentLesson.lesson_type ?? 'video'

  const allLessons = shellResult.data.sections.flatMap((section) => section.lessons)
  const lessonIndex = allLessons.findIndex((lesson) => lesson.id === lessonId)
  const parentSection = shellResult.data.sections.find((section) =>
    section.lessons.some((lesson) => lesson.id === lessonId)
  )
  const moduleName = parentSection
    ? isAr
      ? parentSection.title_ar
      : parentSection.title
    : courseTitle

  const playbackMetadata = {
    courseName: courseTitle,
    moduleName,
    lessonName: lessonTitle,
    lessonNumber: lessonIndex >= 0 ? lessonIndex + 1 : 1,
    totalLessons: shellResult.data.totalLessons,
    courseProgress: shellResult.data.progressPercent,
    durationMinutes: currentLesson.duration_minutes ?? 0,
  }

  const quiz =
    lessonType === 'quiz'
      ? await getLessonQuizForStudent(lessonId, courseId, shellResult.data.userId)
      : null

  const overviewContent = currentLesson.content_html ? (
    <LessonContentDisplay
      contentHtml={currentLesson.content_html}
      locale={locale}
    />
  ) : null

  const belowPlayer = (
    <>
      <div className="hidden space-y-1 lg:block">
        <h1 className="text-2xl font-bold">{lessonTitle}</h1>
        <p className="text-sm text-muted-foreground num-en">
          {moduleName}
          <span className="mx-1.5 text-border" aria-hidden>
            ·
          </span>
          {currentLesson.duration_minutes} {t('minutes')}
        </p>
      </div>

      <div className="space-y-4 lg:hidden">
        <LessonMobileInfo
          title={lessonTitle}
          moduleName={moduleName}
          durationMinutes={currentLesson.duration_minutes ?? 0}
          isCompleted={isLessonCompleted}
          progressPercent={shellResult.data.progressPercent}
        />
        <LessonMobileActionBar
          previousLessonSlug={contentResult.data.previousLessonSlug}
          nextLessonSlug={contentResult.data.nextLessonSlug}
          lessonId={lessonId}
          courseId={courseId}
          initiallyCompleted={isLessonCompleted}
        />
      </div>

      {currentLesson.content_html && (
        <div className="hidden lg:block">
          <LessonContentDisplay
            contentHtml={currentLesson.content_html}
            locale={locale}
          />
        </div>
      )}

      <div className="hidden lg:block">
        <LessonNavigation
          previousLessonSlug={contentResult.data.previousLessonSlug}
          nextLessonSlug={contentResult.data.nextLessonSlug}
        />
      </div>
    </>
  )

  return (
    <>
      {lessonType === 'quiz' && quiz ? (
        <div className="grid gap-6 max-lg:px-3 max-lg:pt-3 lg:grid-cols-9">
          <div className="min-w-0 space-y-4 lg:col-span-6">
            <LessonQuizPlayer
              locale={locale}
              courseId={courseId}
              lessonId={lessonId}
              quiz={quiz}
              isAr={isAr}
            />
            {belowPlayer}
          </div>
        </div>
      ) : lessonType === 'quiz' ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground max-lg:mx-3 max-lg:mt-3">
          {t('quiz_no_questions')}
        </div>
      ) : lessonType === 'pdf' || lessonType === 'download' ? (
        currentLesson.attachment_url ? (
          <div className="max-lg:px-3 max-lg:pt-3">
            <LessonDocumentViewer
              url={currentLesson.attachment_url}
              title={lessonTitle}
              locale={locale}
            />
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground max-lg:mx-3 max-lg:mt-3">
            {t('no_video')}
          </div>
        )
      ) : (
        <div className="flex h-full min-h-0 flex-1 flex-col max-lg:px-3 max-lg:pt-2">
          <LessonVideoPlayer
            hasVideo={contentResult.data.hasVideo}
            lessonId={lessonId}
            courseId={courseId}
            courseSlug={courseParam}
            locale={locale}
            initiallyCompleted={isLessonCompleted}
            isAdmin={shellResult.data.isAdmin}
            metadata={playbackMetadata}
            previousLessonSlug={contentResult.data.previousLessonSlug}
            nextLessonSlug={contentResult.data.nextLessonSlug}
            sidebar={
              <LessonLearningSidebar
                locale={locale}
                courseId={courseId}
                courseTitle={courseTitle}
                lessonId={lessonId}
                userId={shellResult.data.userId}
                initialTab={tabParam}
                highlightThreadId={threadParam}
                overviewContent={overviewContent}
              />
            }
            belowPlayer={belowPlayer}
          />
        </div>
      )}
    </>
  )
}
