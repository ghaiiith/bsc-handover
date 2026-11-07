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
import { Badge } from '@/components/ui/badge'
import StarRating from '@/components/courses/StarRating'
import { formatDate, formatPrice } from '@/lib/utils'
import type {
  InstructorCourseRevenue,
  InstructorRevenueData,
  InstructorRevenueStats,
} from '@/lib/instructor/get-instructor-revenue'

interface InstructorRevenueSectionProps {
  locale: string
  stats: InstructorRevenueStats
  perCourse: InstructorCourseRevenue[]
  transactions: InstructorRevenueData['transactions']
}

export default async function InstructorRevenueSection({
  locale,
  stats,
  perCourse,
  transactions,
}: InstructorRevenueSectionProps) {
  const t = await getTranslations('revenue')
  const tInstructor = await getTranslations('instructor')
  const isAr = locale === 'ar'

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t('section_title')}</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('total_earnings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(stats.totalEarnings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('pending_earnings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{t('coming_soon')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('total_enrollments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('per_course')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto p-4 sm:p-6 pt-0">
            {perCourse.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t('no_data')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tInstructor('course_name')}</TableHead>
                    <TableHead>{t('enrollments')}</TableHead>
                    <TableHead>{t('revenue')}</TableHead>
                    <TableHead>{tInstructor('rating')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perCourse.map((row) => (
                    <TableRow key={row.courseId}>
                      <TableCell className="font-medium max-w-[200px]">
                        <span className="line-clamp-2">
                          {isAr ? row.titleAr : row.title}
                        </span>
                      </TableCell>
                      <TableCell>{row.enrollments}</TableCell>
                      <TableCell>{formatPrice(row.revenue)}</TableCell>
                      <TableCell>
                        <StarRating rating={row.avgRating} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('recent_transactions')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto p-4 sm:p-6 pt-0">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t('no_transactions')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tInstructor('student_name')}</TableHead>
                    <TableHead>{tInstructor('course_name')}</TableHead>
                    <TableHead>{tInstructor('amount')}</TableHead>
                    <TableHead>{tInstructor('enrollment_date')}</TableHead>
                    <TableHead>{tInstructor('filter_status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {isAr
                          ? tx.studentNameAr ?? tx.studentName
                          : tx.studentName}
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <span className="line-clamp-2">
                          {isAr ? tx.courseTitleAr : tx.courseTitle}
                        </span>
                      </TableCell>
                      <TableCell>{formatPrice(tx.instructorEarnings)}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(tx.date, locale)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
