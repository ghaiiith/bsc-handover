import { getTranslations } from 'next-intl/server'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatPrice } from '@/lib/utils'
import type { RecentEnrollmentRow } from '@/lib/instructor/get-instructor-dashboard'

interface RecentEnrollmentsTableProps {
  locale: string
  enrollments: RecentEnrollmentRow[]
}

export default async function RecentEnrollmentsTable({
  locale,
  enrollments,
}: RecentEnrollmentsTableProps) {
  const t = await getTranslations('instructor')
  const tCourses = await getTranslations('courses')
  const isAr = locale === 'ar'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('recent_enrollments')}</CardTitle>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t('no_recent_enrollments')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('student_name')}</TableHead>
                <TableHead>{t('course_name')}</TableHead>
                <TableHead>{t('enrollment_date')}</TableHead>
                <TableHead className="text-end">{t('amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((row) => {
                const studentName = isAr
                  ? row.studentNameAr ?? row.studentName
                  : row.studentName
                const courseTitle = isAr ? row.courseTitleAr : row.courseTitle

                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{studentName}</TableCell>
                    <TableCell>{courseTitle}</TableCell>
                    <TableCell>{formatDate(row.enrolledAt, locale)}</TableCell>
                    <TableCell className="text-end">
                      {row.amount === 0 ? tCourses('free') : formatPrice(row.amount)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
