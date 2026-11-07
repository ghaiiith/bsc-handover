'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyToJobAction } from '@/lib/jobs/applications'

interface JobApplyPanelProps {
  jobId: string
  locale: string
  alreadyApplied: boolean
  defaultCvUrl?: string
}

export default function JobApplyPanel({
  jobId,
  locale,
  alreadyApplied,
  defaultCvUrl,
}: JobApplyPanelProps) {
  const t = useTranslations('jobs')
  const [open, setOpen] = useState(false)
  const [applied, setApplied] = useState(alreadyApplied)
  const [cvUrl, setCvUrl] = useState(defaultCvUrl ?? '')
  const [coverLetter, setCoverLetter] = useState('')
  const [pending, startTransition] = useTransition()

  if (applied) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        {t('already_applied')}
      </div>
    )
  }

  function submit() {
    if (!cvUrl.trim()) {
      toast.error(t('cv_url_required'))
      return
    }
    startTransition(async () => {
      const res = await applyToJobAction(jobId, { cvUrl, coverLetter }, locale)
      if (!res.success) {
        if (res.error === 'already_applied') {
          setApplied(true)
          return
        }
        toast.error(res.error === 'invalid_cv_url' ? t('invalid_cv_url') : t('apply_error'))
        return
      }
      setApplied(true)
      setOpen(false)
      toast.success(t('application_sent'))
    })
  }

  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        {t('apply_now')}
      </Button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{t('cv_url_label')}</label>
        <Input
          value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
          placeholder={t('cv_url_placeholder')}
          dir="ltr"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{t('cover_letter_label')}</label>
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={t('cover_letter_placeholder')}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={submit} disabled={pending}>
          {pending ? t('submitting') : t('submit_application')}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  )
}
