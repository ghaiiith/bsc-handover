'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FileText, HelpCircle, Lock, PlayCircle } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import LessonPreviewModal from '@/components/courses/LessonPreviewModal'
import { formatDurationMinutes, countCurriculumLessons, sumCurriculumDurationMinutes } from '@/lib/courses/format-duration'
import { UNCATEGORIZED_SECTION_ID } from '@/types/course-detail'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import {
  isDocumentLessonType,
  isVideoLessonType,
} from '@/lib/courses/lesson-type-utils'
import type { CourseSectionWithLessons } from '@/types/course-detail'
import type { LessonType } from '@/types'

interface CourseCurriculumProps {
  locale: string
  courseSlug: string
  sections: CourseSectionWithLessons[]
}

const LESSON_TYPE_ICON: Partial<Record<LessonType, string>> = {
  video: '▶',
  pdf: '📄',
  quiz: '❓',
  article: '📝',
  download: '📎',
}

type PreviewState = {
  title: string
  lessonType: LessonType
  courseId?: string
  lessonId?: string
  documentUrl?: string
}

export default function CourseCurriculum({
  locale,
  courseSlug,
  sections,
}: CourseCurriculumProps) {
  const t = useTranslations('courses')
  const isAr = locale === 'ar'
  const [previewLesson, setPreviewLesson] = useState<PreviewState | null>(null)

  const durationLabels = {
    minutes: t('minutes'),
    hours: t('hours'),
    hour: t('hour'),
  }
  const allSectionIds = sections.map((section) => section.id)
  const totalLessons = countCurriculumLessons(sections)
  const totalDuration = sumCurriculumDurationMinutes(sections)

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        {t('curriculum_total', {
          lessons: totalLessons,
          duration: formatDurationMinutes(totalDuration, durationLabels),
        })}
      </p>

      <Accordion defaultValue={allSectionIds} className="w-full">
        {sections.map((section) => {
          const sectionTitle =
            section.id === UNCATEGORIZED_SECTION_ID
              ? t('curriculum_uncategorized')
              : isAr
                ? section.title_ar
                : section.title
          const sectionDuration = section.lessons.reduce(
            (sum, lesson) => sum + lesson.duration_minutes,
            0
          )

          return (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="hover:no-underline px-1">
                <div className="flex flex-1 flex-col items-start gap-1 text-start sm:flex-row sm:items-center sm:justify-between pe-2">
                  <span className="font-medium">{sectionTitle}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {section.lessons.length} {t('lessons')} ·{' '}
                    {formatDurationMinutes(sectionDuration, durationLabels)}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 ps-1">
                  {section.lessons.map((lesson) => {
                    const lessonTitle = isAr ? lesson.title_ar : lesson.title
                    const lessonType = (lesson.lesson_type ?? 'video') as LessonType
                    const isVideo = isVideoLessonType(lessonType)
                    const isDocument = isDocumentLessonType(lessonType)
                    const hasVideo = isVideo && Boolean(lesson.video_asset_id)
                    const hasDocument = isDocument && Boolean(lesson.attachment_url)
                    const isPreview = lesson.is_free_preview
                    const canOpenPreview =
                      isPreview &&
                      (hasVideo ||
                        hasDocument ||
                        lessonType === 'quiz' ||
                        lessonType === 'article' ||
                        lessonType === 'external')

                    const typeIcon = LESSON_TYPE_ICON[lessonType] ?? '•'

                    const openPreview = () =>
                      setPreviewLesson({
                        title: lessonTitle,
                        lessonType,
                        courseId: lesson.course_id,
                        lessonId: lesson.id,
                        documentUrl: lesson.attachment_url,
                      })

                    return (
                      <li
                        key={lesson.id}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs shrink-0 w-4 text-center" aria-hidden>
                            {typeIcon}
                          </span>

                          {canOpenPreview && (hasVideo || hasDocument) ? (
                            <button
                              type="button"
                              onClick={openPreview}
                              className="flex items-center gap-2 text-start text-primary hover:underline min-w-0"
                            >
                              {isDocument ? (
                                <FileText className="h-4 w-4 shrink-0 text-primary" />
                              ) : (
                                <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                              )}
                              <span className="truncate">{lessonTitle}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({t('preview')})
                              </span>
                            </button>
                          ) : canOpenPreview ? (
                            <Link
                              href={buildLearnLessonPath(locale, courseSlug, lesson.slug)}
                              className="flex items-center gap-2 text-start text-primary hover:underline min-w-0"
                            >
                              {lessonType === 'quiz' ? (
                                <HelpCircle className="h-4 w-4 shrink-0" />
                              ) : (
                                <PlayCircle className="h-4 w-4 shrink-0" />
                              )}
                              <span className="truncate">{lessonTitle}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({t('preview')})
                              </span>
                            </Link>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate text-muted-foreground">{lessonTitle}</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 num-en">
                          {formatDurationMinutes(lesson.duration_minutes, durationLabels)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {previewLesson && (
        <LessonPreviewModal
          open={Boolean(previewLesson)}
          onOpenChange={(open) => !open && setPreviewLesson(null)}
          title={previewLesson.title}
          locale={locale}
          lessonType={previewLesson.lessonType}
          courseId={previewLesson.courseId}
          lessonId={previewLesson.lessonId}
          documentUrl={previewLesson.documentUrl}
        />
      )}
    </>
  )
}
