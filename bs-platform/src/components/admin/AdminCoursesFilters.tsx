'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AdminCourseStatusFilter } from '@/lib/admin/get-admin-courses'

interface AdminCoursesFiltersProps {
  locale: string
  status: AdminCourseStatusFilter
}

export default function AdminCoursesFilters({
  locale,
  status,
}: AdminCoursesFiltersProps) {
  const t = useTranslations('admin')
  const router = useRouter()

  const handleChange = (value: string | null) => {
    const nextStatus = value ?? 'all'
    const qs = nextStatus === 'all' ? '' : `?status=${nextStatus}`
    router.push(`/${locale}/admin/courses${qs}`)
  }

  return (
    <div className="space-y-2 w-full sm:w-48">
      <Label>{t('filter_status')}</Label>
      <Select value={status} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('status_all')}</SelectItem>
          <SelectItem value="draft">{t('status_draft')}</SelectItem>
          <SelectItem value="pending">{t('status_pending')}</SelectItem>
          <SelectItem value="published">{t('status_published')}</SelectItem>
          <SelectItem value="rejected">{t('status_rejected')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
