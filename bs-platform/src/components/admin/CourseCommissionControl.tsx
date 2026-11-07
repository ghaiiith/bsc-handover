'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { setCourseCommission } from '@/lib/admin/admin-course-actions'

// Report BS-78: admin sets the platform commission % for a single course. Empty
// = fall back to the instructor agreement / platform default.
export default function CourseCommissionControl({
  courseId,
  initial,
  locale,
}: {
  courseId: string
  initial: number | null
  locale: string
}) {
  const t = useTranslations('admin')
  const [value, setValue] = useState(initial === null ? '' : String(initial))
  const [pending, startTransition] = useTransition()

  const save = () => {
    const trimmed = value.trim()
    const pct = trimmed === '' ? null : Number(trimmed)
    if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
      toast.error(t('commission_invalid'))
      return
    }
    startTransition(async () => {
      const res = await setCourseCommission(courseId, pct, locale)
      if (res.error) toast.error(t('commission_invalid'))
      else toast.success(t('commission_saved'))
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('commission_default')}
        className="h-8 w-20 text-xs"
        disabled={pending}
      />
      <span className="text-xs text-muted-foreground">%</span>
      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={pending} onClick={save}>
        <Check className="h-4 w-4" />
      </Button>
    </div>
  )
}
