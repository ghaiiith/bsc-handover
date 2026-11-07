import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import PageHeader from '@/components/dashboard/ux/PageHeader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StarRating from '@/components/courses/StarRating'
import EmptyState from '@/components/dashboard/ux/EmptyState'
import { formatDate, formatPrice } from '@/lib/utils'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getInstructorRevenueData } from '@/lib/instructor/get-instructor-revenue'
import { Wallet } from 'lucide-react'

export default async function InstructorEarningsPage() {
  const locale = await getLocale()
  const t = await getTranslations('revenue')
  const tInstructor = await getTranslations('instructor')
  const { userId } = await requireInstructorAccess(locale)
  const isAr = locale === 'ar'

  const revenue = await getInstructorRevenueData(userId)
  const { stats, perCourse, transactions } = revenue

  return (
    <>
      <PageHeader
        title={t('section_title')}
        description={t('overview_desc')}
      />

      <div className="space-y-6">
        {!stats.hasAgreement && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            {t('no_revenue_agreement')}
          </div>
        )}

        {revenue.agreement && (
          <p className="text-sm text-muted-foreground">
            {t('current_agreement', {
              platform: revenue.agreement.platformPercentage,
              instructor: revenue.agreement.instructorPercentage,
            })}
          </p>
        )}

        <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('total_earnings')}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatPrice(stats.totalEarnings)}
            </p>
            {/* Report BS-78: gross -> gateway fee -> net -> platform share ->
                trainer share, shown wherever earnings are displayed. */}
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">{t('gross_price')}</p>
                <p className="font-medium">{formatPrice(stats.grossRevenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('gateway_fee')}</p>
                <p className="font-medium">{formatPrice(stats.totalGatewayFees)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('net_received')}</p>
                <p className="font-medium">
                  {formatPrice(stats.grossRevenue - stats.totalGatewayFees)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('platform_share')}</p>
                <p className="font-medium">{formatPrice(stats.totalPlatformCommission)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('total_enrollments')}</p>
                <p className="font-medium num-en">{stats.totalEnrollments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {perCourse.length === 0 && transactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t('no_data')}
            description={t('no_data_desc')}
            action={{
              href: `/${locale}/instructor/courses/new`,
              label: tInstructor('create_first_course'),
            }}
          />
        ) : (
          <div className="space-y-2">
            {perCourse.length > 0 && (
              <details className="group rounded-xl border bg-card px-4 open:pb-4">
                <summary className="cursor-pointer py-3 text-sm font-medium list-none flex items-center justify-between">
                  {t('per_course')}
                  <span className="text-xs text-muted-foreground group-open:hidden">
                    {t('expand')}
                  </span>
                </summary>
                <div className="overflow-x-auto pb-2">
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
                            <Link
                              href={`/${locale}/instructor/courses/${row.courseId}/studio`}
                              className="line-clamp-2 hover:text-primary hover:underline"
                            >
                              {isAr ? row.titleAr : row.title}
                            </Link>
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
                </div>
              </details>
            )}

            {transactions.length > 0 && (
              <details className="group rounded-xl border bg-card px-4 open:pb-4">
                <summary className="cursor-pointer py-3 text-sm font-medium list-none flex items-center justify-between">
                  {t('recent_transactions')}
                  <span className="text-xs text-muted-foreground group-open:hidden">
                    {t('expand')}
                  </span>
                </summary>
                <div className="overflow-x-auto pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tInstructor('student_name')}</TableHead>
                        <TableHead>{tInstructor('course_name')}</TableHead>
                        <TableHead>{t('gross_price')}</TableHead>
                        <TableHead>{t('gateway_fee')}</TableHead>
                        <TableHead>{t('net_received')}</TableHead>
                        <TableHead>{t('platform_share')}</TableHead>
                        <TableHead>{t('your_earnings')}</TableHead>
                        <TableHead>{tInstructor('enrollment_date')}</TableHead>
                        <TableHead>{t('payout_status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {isAr ? tx.studentNameAr ?? tx.studentName : tx.studentName}
                          </TableCell>
                          <TableCell className="max-w-[160px]">
                            <span className="line-clamp-2">
                              {isAr ? tx.courseTitleAr : tx.courseTitle}
                            </span>
                          </TableCell>
                          <TableCell>{formatPrice(tx.grossAmount)}</TableCell>
                          <TableCell>
                            {tx.isLegacy ? '—' : formatPrice(tx.gatewayFee)}
                          </TableCell>
                          <TableCell>
                            {tx.netReceived != null ? formatPrice(tx.netReceived) : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tx.platformCommission != null
                              ? formatPrice(tx.platformCommission)
                              : '—'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {tx.isLegacy ? '—' : formatPrice(tx.instructorEarnings)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(tx.date, locale)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {tx.payoutStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </>
  )
}
