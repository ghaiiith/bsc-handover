'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updateApplicationStatus, recordContactOutcome } from '@/lib/jobs/applications'
import {
  APPLICATION_STATUSES,
  CONTACT_OUTCOMES,
  type ApplicationStatusValue,
  type ContactOutcomeValue,
} from '@/lib/jobs/application-constants'

interface Props {
  applicationId: string
  initialStatus: string
  initialOutcome: string | null
  locale: string
}

// Report BS-66/BS-63: manage an application by status (never delete) and record
// the contact outcome, which feeds candidate availability + future ranking.
export default function ApplicantManageControls({
  applicationId,
  initialStatus,
  initialOutcome,
  locale,
}: Props) {
  const t = useTranslations('applications')
  const [status, setStatus] = useState(initialStatus)
  const [outcome, setOutcome] = useState<string>(initialOutcome ?? '')
  const [note, setNote] = useState('')
  const [showOutcome, setShowOutcome] = useState(initialStatus === 'contacted')
  const [pending, startTransition] = useTransition()

  const onStatusChange = (next: string) => {
    setStatus(next)
    if (next === 'contacted') setShowOutcome(true)
    startTransition(async () => {
      const res = await updateApplicationStatus(
        applicationId,
        next as ApplicationStatusValue,
        locale
      )
      if (res.error) toast.error(t('update_failed'))
      else toast.success(t('status_updated'))
    })
  }

  const saveOutcome = () => {
    if (!outcome) return
    startTransition(async () => {
      const res = await recordContactOutcome(
        applicationId,
        outcome as ContactOutcomeValue,
        note || undefined,
        locale
      )
      if (res.error) toast.error(t('update_failed'))
      else {
        toast.success(t('outcome_saved'))
        setStatus('contacted')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Select value={status} onValueChange={(v) => v && onStatusChange(v)} disabled={pending}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPLICATION_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {t(`status_${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!showOutcome && (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setShowOutcome(true)}
        >
          {t('record_outcome')}
        </button>
      )}

      {showOutcome && (
        <div className="w-full min-w-[16rem] space-y-2 rounded-md border bg-muted/30 p-2">
          <p className="text-xs font-medium">{t('outcome_title')}</p>
          <Select value={outcome} onValueChange={(v) => setOutcome(v ?? '')} disabled={pending}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t('outcome_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_OUTCOMES.map((o) => (
                <SelectItem key={o} value={o} className="text-xs">
                  {t(`outcome_${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('outcome_note_placeholder')}
            rows={2}
            className="text-xs"
          />
          <Button size="sm" className="h-7 text-xs" disabled={pending || !outcome} onClick={saveOutcome}>
            {t('save_outcome')}
          </Button>
        </div>
      )}
    </div>
  )
}
