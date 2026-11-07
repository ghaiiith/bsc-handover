'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  AdminPaymentMethodFilter,
  AdminPaymentStatusFilter,
  AdminPaymentsParams,
} from '@/lib/admin/get-admin-payments'

interface AdminPaymentsFiltersProps {
  locale: string
  filters: AdminPaymentsParams
}

export default function AdminPaymentsFilters({
  locale,
  filters,
}: AdminPaymentsFiltersProps) {
  const t = useTranslations('admin')
  const router = useRouter()

  const pushFilters = (next: Partial<AdminPaymentsParams>) => {
    const merged = { ...filters, ...next }
    const params = new URLSearchParams()

    if (merged.status && merged.status !== 'all') {
      params.set('status', merged.status)
    }
    if (merged.method && merged.method !== 'all') {
      params.set('method', merged.method)
    }
    if (merged.dateFrom) params.set('from', merged.dateFrom)
    if (merged.dateTo) params.set('to', merged.dateTo)

    const qs = params.toString()
    router.push(`/${locale}/admin/payments${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-2 w-full sm:w-40">
        <Label>{t('filter_status')}</Label>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) =>
            pushFilters({ status: (v ?? 'all') as AdminPaymentStatusFilter })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('status_all')}</SelectItem>
            <SelectItem value="pending">{t('payment_status_pending')}</SelectItem>
            <SelectItem value="completed">{t('payment_status_completed')}</SelectItem>
            <SelectItem value="failed">{t('payment_status_failed')}</SelectItem>
            <SelectItem value="refunded">{t('payment_status_refunded')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 w-full sm:w-40">
        <Label>{t('filter_method')}</Label>
        <Select
          value={filters.method ?? 'all'}
          onValueChange={(v) =>
            pushFilters({ method: (v ?? 'all') as AdminPaymentMethodFilter })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('method_all')}</SelectItem>
            <SelectItem value="zaincash">{t('method_zaincash')}</SelectItem>
            <SelectItem value="qicard">{t('method_qicard')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 w-full sm:w-40">
        <Label>{t('date_from')}</Label>
        <Input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => pushFilters({ dateFrom: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-2 w-full sm:w-40">
        <Label>{t('date_to')}</Label>
        <Input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => pushFilters({ dateTo: e.target.value || undefined })}
        />
      </div>
    </div>
  )
}
