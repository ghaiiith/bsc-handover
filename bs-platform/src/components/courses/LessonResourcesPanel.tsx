'use client'

import { useTranslations } from 'next-intl'
import { Download, ExternalLink, FileText, FolderOpen, MapPin } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { getCourseResourceDownloadUrl } from '@/lib/courses/resource-download-url'
import { effectiveResourceUrlAccessMode } from '@/lib/courses/resource-url-access'
import type { LessonResourceRow } from '@/lib/courses/get-lesson-resources'
import { cn } from '@/lib/utils'

interface LessonResourcesPanelProps {
  locale: string
  resources: LessonResourceRow[]
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LessonResourcesPanel({ locale, resources }: LessonResourcesPanelProps) {
  const t = useTranslations('courses.learn')
  const tc = useTranslations('studio.resources')
  const isAr = locale === 'ar'

  if (resources.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('no_resources')}</p>
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => {
        const title = isAr && resource.title_ar ? resource.title_ar : resource.title
        const sizeLabel = formatFileSize(resource.file_size_bytes ?? 0)
        const isVisitLink =
          effectiveResourceUrlAccessMode(resource.file_url, resource.url_access_mode) ===
          'visit'

        return (
          <div
            key={resource.id}
            className="rounded-lg border bg-muted/10 p-3 text-sm space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FolderOpen className="size-3" />
                    {resource.folder}
                  </span>
                  <span>·</span>
                  <span>{tc(`categories.${resource.category}`)}</span>
                  {sizeLabel && (
                    <>
                      <span>·</span>
                      <span className="num-en">{sizeLabel}</span>
                    </>
                  )}
                </p>
              </div>
              <a
                href={getCourseResourceDownloadUrl(resource.course_id, resource.id)}
                target={isVisitLink ? '_blank' : undefined}
                rel={isVisitLink ? 'noopener noreferrer' : undefined}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                  'inline-flex shrink-0 items-center justify-center'
                )}
                aria-label={isVisitLink ? t('open_resource') : t('download_resource')}
              >
                {isVisitLink ? (
                  <ExternalLink className="size-3.5" />
                ) : (
                  <Download className="size-3.5" />
                )}
              </a>
            </div>

            <div className="space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3 shrink-0 text-primary/80" />
                {t('added_from')}:{' '}
                <span className="text-foreground/80">
                  {resource.added_source === 'lesson_editor'
                    ? t('source_lesson_editor')
                    : t('source_studio')}
                </span>
              </p>
              {resource.lesson_id && (
                <p className="flex items-center gap-1.5">
                  <FileText className="size-3 shrink-0" />
                  {t('linked_lesson')}:{' '}
                  <span className="text-foreground/80">
                    {isAr && resource.lesson_title_ar
                      ? resource.lesson_title_ar
                      : resource.lesson_title ?? t('this_lesson')}
                  </span>
                </p>
              )}
              {!resource.lesson_id && (
                <p className="flex items-center gap-1.5">
                  <FileText className="size-3 shrink-0" />
                  {t('scope_course_wide')}
                </p>
              )}
              <p className={cn('num-en', isAr && 'text-end')}>
                {t('added_at')}: {formatDate(resource.created_at, locale)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
