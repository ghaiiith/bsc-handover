'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CourseStatusBadge from '@/components/courses/CourseStatusBadge'
import { saveCourseStep4, submitCourseForReview } from '@/lib/instructor/course-wizard-actions'
import { saveCourseStudioInfo } from '@/lib/instructor/studio/studio-actions'
import type { Course, CourseStatus } from '@/types'
import { toast } from 'sonner'

interface StudioSettingsFormProps {
  locale: string
  course: Course
}

function submitErrorMessage(
  error: string | undefined,
  t: ReturnType<typeof useTranslations<'studio.settings'>>
): string {
  switch (error) {
    case 'no_curriculum':
      return t('errors.no_curriculum')
    case 'missing_title':
      return t('errors.missing_title')
    case 'already_pending':
      return t('errors.already_pending')
    case 'already_published':
      return t('errors.already_published')
    default:
      return t('publish_error')
  }
}

export default function StudioSettingsForm({ locale, course }: StudioSettingsFormProps) {
  const t = useTranslations('studio.settings')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [accessType, setAccessType] = useState(course.access_type ?? 'lifetime')
  const [price, setPrice] = useState(course.price ?? 0)
  const [certificateEnabled, setCertificateEnabled] = useState(
    course.certificate_enabled ?? false
  )

  const status = course.status as CourseStatus
  const canSubmit = status === 'draft' || status === 'rejected'

  const handleSave = () => {
    startTransition(async () => {
      const pricing = await saveCourseStep4(course.id, price, locale)
      if (!pricing.success) {
        toast.error(t('save_error'))
        return
      }

      const extended = await saveCourseStudioInfo(course.id, locale, {
        access_type: accessType,
        certificate_enabled: certificateEnabled,
      })

      if (!extended.success) {
        toast.error(t('save_error'))
        return
      }

      toast.success(t('saved'))
      router.refresh()
    })
  }

  const handleSubmitForReview = () => {
    startTransition(async () => {
      const pricing = await saveCourseStep4(course.id, price, locale)
      if (!pricing.success) {
        toast.error(t('save_error'))
        return
      }

      const result = await submitCourseForReview(course.id, locale)
      if (!result.success) {
        toast.error(submitErrorMessage(result.error, t))
        return
      }

      toast.success(t('submitted'))
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="edu-card shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('publishing_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{t('current_status')}</p>
            <div className="mt-2 flex items-center gap-2">
              <CourseStatusBadge status={status} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {status === 'draft' && t('status_help_draft')}
              {status === 'pending' && t('status_help_pending')}
              {status === 'published' && t('status_help_published')}
              {status === 'rejected' && t('status_help_rejected')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('access')}</Label>
            <Select
              value={accessType}
              onValueChange={(v) => v && setAccessType(v as 'lifetime' | 'subscription')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lifetime">{t('access_lifetime')}</SelectItem>
                <SelectItem value="subscription">{t('access_subscription')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="edu-card shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('pricing_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('price')}</Label>
            <Input
              type="number"
              min={0}
              className="num-en"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="edu-card shadow-none lg:col-span-2">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch checked={certificateEnabled} onCheckedChange={setCertificateEnabled} />
            <div>
              <p className="text-sm font-medium">{t('certificate_auto')}</p>
              <p className="text-xs text-muted-foreground">{t('certificate_hint')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canSubmit && (
              <Button onClick={handleSubmitForReview} disabled={pending} className="gap-2">
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {t('submit_review')}
              </Button>
            )}
            <Button variant="outline" onClick={handleSave} disabled={pending} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
