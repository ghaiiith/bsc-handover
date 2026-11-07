'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Circle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import { useLessonPlayer } from '@/components/courses/LessonPlayerProvider'
import { CurriculumPanelToggle } from '@/components/courses/LearnWorkspaceLayout'
import LessonCurriculumCompletion from '@/components/courses/LessonCurriculumCompletion'

export default function LessonCurriculumSidebar() {
  const t = useTranslations('courses')
  const params = useParams<{ lessonSlug: string }>()
  const currentLessonSlug = params.lessonSlug

  const {
    locale,
    courseSlug,
    courseTitle,
    sections,
    completedLessonIds,
    progressPercent,
    isCourseComplete,
    certStatus,
    courseId,
  } = useLessonPlayer()

  const isAr = locale === 'ar'
  const completedSet = new Set(completedLessonIds)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="shrink-0 space-y-3 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('curriculum')}</h2>
          <CurriculumPanelToggle />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('progress')}</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {sections.map((section) => {
          const sectionTitle = isAr ? section.title_ar : section.title

          return (
            <div key={section.id} className="mb-4">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {sectionTitle}
              </p>
              <ul className="space-y-0.5">
                {section.lessons.map((lesson) => {
                  const lessonTitle = isAr ? lesson.title_ar : lesson.title
                  const isActive = lesson.slug === currentLessonSlug
                  const isCompleted = completedSet.has(lesson.id)

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={buildLearnLessonPath(locale, courseSlug, lesson.slug)}
                        scroll={false}
                        prefetch
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                          isActive && 'bg-primary/10 font-medium text-primary'
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="line-clamp-2 flex-1">{lessonTitle}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {lesson.duration_minutes} {t('minutes')}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
        <LessonCurriculumCompletion
          locale={locale}
          courseId={courseId}
          courseTitle={courseTitle}
          isCourseComplete={isCourseComplete}
          certStatus={certStatus}
        />
      </div>
    </div>
  )
}
