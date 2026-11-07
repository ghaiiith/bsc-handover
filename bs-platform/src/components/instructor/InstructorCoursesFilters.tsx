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
import type { InstructorCourseStatusFilter } from '@/lib/instructor/get-instructor-courses'

interface InstructorCoursesFiltersProps {
  locale: string
  status: InstructorCourseStatusFilter
}

export default function InstructorCoursesFilters({
  locale,
  status,
}: InstructorCoursesFiltersProps) {
  const t = useTranslations('instructor')
  const router = useRouter()

  const handleChange = (value: string | null) => {
    const nextStatus = value ?? 'all'
    const qs =
      nextStatus === 'all'
        ? ''
        : `?status=${nextStatus}`
    router.push(`/${locale}/instructor/courses${qs}`)
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
