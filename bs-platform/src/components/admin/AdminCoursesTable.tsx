'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BookOpen, Check, X, EyeOff, Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import CourseStatusBadge from '@/components/courses/CourseStatusBadge'
import RejectCourseDialog from '@/components/admin/RejectCourseDialog'
import AdminCoursePreviewDialog from '@/components/admin/AdminCoursePreviewDialog'
import CourseCommissionControl from '@/components/admin/CourseCommissionControl'
import { approveCourse, unpublishCourse } from '@/lib/admin/admin-course-actions'
import { useCourseCategories } from '@/components/categories/CourseCategoriesProvider'
import { formatDate, formatPrice } from '@/lib/utils'
import type { AdminCourseRow } from '@/lib/admin/get-admin-courses'

interface AdminCoursesTableProps {
  locale: string
  courses: AdminCourseRow[]
}

const PROVIDER_LABELS: Record<string, string> = {
  vimeo: 'Vimeo',
  r2: 'R2',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  return `${m}m`
}

export default function AdminCoursesTable({
  locale,
  courses,
}: AdminCoursesTableProps) {
  const t = useTranslations('admin')
  const categories = useCourseCategories()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{
    id: string
    title: string
  } | null>(null)

  const isAr = locale === 'ar'

  const runAction = (
    courseId: string,
    action: () => Promise<{ success?: boolean; error?: string }>
  ) => {
    setPendingCourseId(courseId)
    startTransition(async () => {
      await action()
      setPendingCourseId(null)
      router.refresh()
    })
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        {t('no_courses')}
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[72px]" />
            <TableHead>{t('course_name')}</TableHead>
            <TableHead>{t('instructor_name')}</TableHead>
            <TableHead>{t('category_column')}</TableHead>
            <TableHead>{t('price_column')}</TableHead>
            <TableHead>{t('platform_commission_column')}</TableHead>
            <TableHead>{t('enrollments_column')}</TableHead>
            <TableHead>{t('video_provider_column')}</TableHead>
            <TableHead>{t('video_status_column')}</TableHead>
            <TableHead>{t('video_health_column')}</TableHead>
            <TableHead>{t('video_duration_column')}</TableHead>
            <TableHead>{t('video_storage_column')}</TableHead>
            <TableHead>{t('video_cost_column')}</TableHead>
            <TableHead>{t('filter_status')}</TableHead>
            <TableHead>{t('submitted_date')}</TableHead>
            <TableHead className="text-end">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => {
            const title = isAr ? course.title_ar : course.title
            const subTitle = isAr ? course.title : course.title_ar
            const instructorName = isAr
              ? course.instructor.full_name_ar ?? course.instructor.full_name
              : course.instructor.full_name
            const isRowPending = isPending && pendingCourseId === course.id

            return (
              <TableRow key={course.id}>
                <TableCell>
                  <div className="relative h-10 w-16 overflow-hidden rounded-md bg-muted">
                    {course.thumbnail_url ? (
                      <Image
                        src={course.thumbnail_url}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-[220px]">
                  <Link
                    href={`/${locale}/courses/${course.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline"
                  >
                    <span className="line-clamp-1">{title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{subTitle}</span>
                  </Link>
                </TableCell>
                <TableCell className="max-w-[160px]">
                  <span className="line-clamp-2">{instructorName}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs">
                    {categories.find((c) => c.value === course.category)
                      ? (isAr
                          ? categories.find((c) => c.value === course.category)!.label
                          : categories.find((c) => c.value === course.category)!.labelEn)
                      : course.category}
                  </span>
                </TableCell>
                <TableCell>
                  {course.price > 0 ? (
                    <span>{formatPrice(course.price)}</span>
                  ) : (
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded w-fit">
                      {t('free_badge')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <CourseCommissionControl
                    courseId={course.id}
                    initial={
                      course.platform_commission_pct === null ||
                      course.platform_commission_pct === undefined
                        ? null
                        : Number(course.platform_commission_pct)
                    }
                    locale={locale}
                  />
                </TableCell>
                <TableCell>{course.enrollment_count}</TableCell>
                <TableCell className="text-xs">
                  {course.video_summary?.primaryProvider
                    ? PROVIDER_LABELS[course.video_summary.primaryProvider] ??
                      course.video_summary.primaryProvider
                    : '—'}
                </TableCell>
                <TableCell className="text-xs capitalize">
                  {course.video_summary?.videoStatus ?? '—'}
                </TableCell>
                <TableCell className="text-xs capitalize">
                  {course.video_summary?.health ?? '—'}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDuration(course.video_summary?.durationSeconds ?? 0)}
                  {course.video_summary?.resolution
                    ? ` · ${course.video_summary.resolution}`
                    : ''}
                </TableCell>
                <TableCell className="text-xs">
                  {course.video_summary?.storageBytes
                    ? formatBytes(course.video_summary.storageBytes)
                    : '—'}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {course.video_summary?.estimatedMonthlyCostUsd
                    ? `$${course.video_summary.estimatedMonthlyCostUsd.toFixed(2)}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <CourseStatusBadge status={course.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                  {formatDate(course.updated_at, locale)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {/* Report BS-97: watch the configured video before approving. */}
                    <AdminCoursePreviewDialog
                      courseId={course.id}
                      title={title}
                      poster={course.thumbnail_url}
                    />
                    <Link
                      href={`/${locale}/instructor/courses/${course.id}/studio`}
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('manage_course')}
                    </Link>
                    {course.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={isRowPending}
                          onClick={() =>
                            runAction(course.id, () =>
                              approveCourse(course.id, locale)
                            )
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t('approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={isRowPending}
                          onClick={() =>
                            setRejectTarget({ id: course.id, title })
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                          {t('reject')}
                        </Button>
                      </>
                    )}
                    {course.status === 'published' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={isRowPending}
                        onClick={() =>
                          runAction(course.id, () =>
                            unpublishCourse(course.id, locale)
                          )
                        }
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {t('unpublish')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <RejectCourseDialog
        locale={locale}
        courseId={rejectTarget?.id ?? null}
        courseTitle={rejectTarget?.title ?? ''}
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null)
        }}
      />

    </>
  )
}
