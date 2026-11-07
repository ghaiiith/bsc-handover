import { getLocale, getTranslations } from 'next-intl/server'
import { HelpCircle, MapPin } from 'lucide-react'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioQuizzesList from '@/components/instructor/studio/StudioQuizzesList'
import QuizFromContentDialog from '@/components/instructor/studio/QuizFromContentDialog'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseQuizzes } from '@/lib/instructor/studio/studio-actions'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudioQuizzesPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.quizzes')
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  const quizzes = await getCourseQuizzes(id, userId)

  // Report BS-77: lessons a generated quiz can be attached to.
  const lessonOptions = ctx.sections.flatMap((s) =>
    (s.lessons ?? []).map((l) => ({
      id: l.id as string,
      title: l.title as string,
      title_ar: (l.title_ar as string | null) ?? null,
    }))
  )

  const listItems = quizzes.map((q) => {
    const row = q as {
      id: string
      title: string
      passing_score: number
      lesson_id: string | null
      quiz_questions?: { count: number }[]
      lessons?: { id: string; title: string; title_ar: string | null } | { id: string; title: string; title_ar: string | null }[] | null
    }
    const lesson = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons
    return {
      id: row.id,
      title: row.title,
      passing_score: row.passing_score,
      questionCount: row.quiz_questions?.[0]?.count ?? 0,
      lessonId: row.lesson_id,
      lessonTitle: lesson?.title ?? null,
      lessonTitleAr: lesson?.title_ar ?? null,
    }
  })

  return (
    <>
      <CourseStudioHeader
        locale={locale}
        course={ctx.course}
        title={t('page_title')}
        subtitle={t('page_subtitle')}
      />
      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              {t('curriculum_only_hint')}
            </p>
          </div>
          {/* Report BS-77: generate quizzes from uploaded/pasted content. */}
          {lessonOptions.length > 0 && (
            <QuizFromContentDialog courseId={id} lessons={lessonOptions} />
          )}
        </div>
        {listItems.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">{t('empty')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('empty_curriculum_hint')}</p>
          </div>
        ) : (
          <StudioQuizzesList locale={locale} courseId={id} quizzes={listItems} />
        )}
      </div>
    </>
  )
}
