import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { BookOpen, Pencil, Eye } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import CourseStatusBadge from '@/components/courses/CourseStatusBadge'
import StarRating from '@/components/courses/StarRating'
import { cn, formatPrice } from '@/lib/utils'
import type { InstructorCourseRow } from '@/lib/instructor/get-instructor-courses'

interface InstructorCoursesTableProps {
  locale: string
  courses: InstructorCourseRow[]
}

export default async function InstructorCoursesTable({
  locale,
  courses,
}: InstructorCoursesTableProps) {
  const t = await getTranslations('instructor')
  const tCourses = await getTranslations('courses')
  const tCommon = await getTranslations('common')
  const isAr = locale === 'ar'

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        {tCourses('no_courses')}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[72px]" />
          <TableHead>{t('course_name')}</TableHead>
          <TableHead>{t('filter_status')}</TableHead>
          <TableHead>{t('price')}</TableHead>
          <TableHead>{t('enrollments_count')}</TableHead>
          <TableHead>{t('rating')}</TableHead>
          <TableHead className="text-end">{tCommon('view')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => {
          const title = isAr ? course.title_ar : course.title

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
              <TableCell className="font-medium max-w-[200px]">
                <span className="line-clamp-2">{title}</span>
              </TableCell>
              <TableCell>
                <CourseStatusBadge status={course.status} />
              </TableCell>
              <TableCell>
                {course.price === 0 ? tCourses('free') : formatPrice(course.price)}
              </TableCell>
              <TableCell>{course.enrollment_count}</TableCell>
              <TableCell>
                <StarRating
                  rating={course.avg_rating}
                  showCount
                  count={course.review_count}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/${locale}/instructor/courses/${course.id}/studio`}
                    className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('manage_course')}
                  </Link>
                  <Link
                    href={`/${locale}/courses/${course.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t('preview')}
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
