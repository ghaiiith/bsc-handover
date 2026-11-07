'use client'

import { useState } from 'react'
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
import type { AdminJobStatusFilter } from '@/lib/jobs/get-admin-jobs'

interface AdminJobsFiltersProps {
  locale: string
  status: AdminJobStatusFilter
  q?: string
}

export default function AdminJobsFilters({
  locale,
  status,
  q,
}: AdminJobsFiltersProps) {
  const t = useTranslations('jobs')
  const router = useRouter()
  const [query, setQuery] = useState(q ?? '')

  const pushFilters = (next: { status?: AdminJobStatusFilter; q?: string }) => {
    const params = new URLSearchParams()
    const nextStatus = next.status ?? status
    const nextQ = next.q !== undefined ? next.q : query

    if (nextStatus !== 'all') params.set('status', nextStatus)
    if (nextQ.trim()) params.set('q', nextQ.trim())

    const qs = params.toString()
    router.push(`/${locale}/admin/jobs${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
      <div className="space-y-2 w-full sm:w-48">
        <Label>{t('status_col')}</Label>
        <Select
          value={status}
          onValueChange={(v) =>
            pushFilters({ status: (v ?? 'all') as AdminJobStatusFilter })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('status_all')}</SelectItem>
            <SelectItem value="active">{t('job_status_active')}</SelectItem>
            <SelectItem value="closed">{t('job_status_closed')}</SelectItem>
            <SelectItem value="draft">{t('job_status_draft')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 flex-1 max-w-sm">
        <Label>{t('search_placeholder')}</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search_placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              pushFilters({ q: query })
            }
          }}
        />
      </div>
    </div>
  )
}
