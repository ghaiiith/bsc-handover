'use client'

import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import { escapeCsvCell } from '@/lib/csv/escape'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate, formatPrice } from '@/lib/utils'
import type { AdminPaymentRow } from '@/lib/admin/get-admin-payments'
import type { PaymentStatus } from '@/types'

const statusStyles: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  refunded: 'bg-muted text-muted-foreground',
}

interface AdminPaymentsTableProps {
  locale: string
  payments: AdminPaymentRow[]
}

export default function AdminPaymentsTable({
  locale,
  payments,
}: AdminPaymentsTableProps) {
  const t = useTranslations('admin')
  const isAr = locale === 'ar'

  const handleExportCsv = () => {
    const headers = [
      'Reference',
      'Student',
      'Course',
      'Instructor',
      'Gross',
      'Gateway Fee',
      'Net',
      'Platform',
      'Instructor',
      'Method',
      'Status',
      'Date',
    ]

    const rows = payments.map((p) => [
      p.referenceId,
      isAr ? p.studentNameAr ?? p.studentName : p.studentName,
      isAr ? p.courseTitleAr : p.courseTitle,
      p.instructorName,
      p.grossAmount.toString(),
      p.gatewayFee.toString(),
      p.netReceived?.toString() ?? '',
      p.platformRevenue?.toString() ?? '',
      p.instructorRevenue?.toString() ?? '',
      p.method,
      p.status,
      p.createdAt,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (payments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        {t('no_payments')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv}>
          <Download className="h-4 w-4" />
          {t('export_csv')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('reference_id')}</TableHead>
            <TableHead>{t('student_name')}</TableHead>
            <TableHead>{t('course_name')}</TableHead>
            <TableHead>{t('gross_revenue')}</TableHead>
            <TableHead>{t('gateway_expenses')}</TableHead>
            <TableHead>{t('net_revenue')}</TableHead>
            <TableHead>{t('platform_revenue')}</TableHead>
            <TableHead>{t('instructor_revenue_total')}</TableHead>
            <TableHead>{t('filter_method')}</TableHead>
            <TableHead>{t('filter_status')}</TableHead>
            <TableHead>{t('payment_date')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-mono text-xs max-w-[120px] truncate">
                {payment.referenceId}
              </TableCell>
              <TableCell>
                {isAr
                  ? payment.studentNameAr ?? payment.studentName
                  : payment.studentName}
              </TableCell>
              <TableCell className="max-w-[140px]">
                <span className="line-clamp-2">
                  {isAr ? payment.courseTitleAr : payment.courseTitle}
                </span>
                <span className="text-xs text-muted-foreground">{payment.instructorName}</span>
              </TableCell>
              <TableCell>{formatPrice(payment.grossAmount)}</TableCell>
              <TableCell>
                {payment.isLegacy ? '—' : formatPrice(payment.gatewayFee)}
              </TableCell>
              <TableCell>
                {payment.netReceived != null ? formatPrice(payment.netReceived) : '—'}
              </TableCell>
              <TableCell>
                {payment.platformRevenue != null
                  ? formatPrice(payment.platformRevenue)
                  : '—'}
              </TableCell>
              <TableCell>
                {payment.instructorRevenue != null
                  ? formatPrice(payment.instructorRevenue)
                  : '—'}
              </TableCell>
              <TableCell className="text-xs capitalize">{payment.method}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(statusStyles[payment.status])}
                >
                  {t(`payment_status_${payment.status}`)}
                </Badge>
                {payment.isLegacy && (
                  <span className="ms-1 text-[10px] text-muted-foreground">legacy</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                {formatDate(payment.createdAt, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
