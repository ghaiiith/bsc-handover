'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JOB_STATUS_ANSWERS, type JobStatusAnswer } from '@/lib/jobs/job-status-constants'
import { answerJobStatus } from '@/lib/jobs/job-status-actions'

// Report BS-64: one-tap answer to the monthly "did you find a job?" ping.
export default function JobStatusAnswerButtons() {
  const t = useTranslations('jobStatus')
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const answer = (a: JobStatusAnswer) => {
    startTransition(async () => {
      const res = await answerJobStatus(a)
      if (res.error) toast.error(t('failed'))
      else {
        setDone(true)
        toast.success(t('thanks'))
      }
    })
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <Check className="h-5 w-5" />
        {t('thanks')}
      </div>
    )
  }

  return (
    <>
    <div className="grid gap-3 sm:grid-cols-2">
      {JOB_STATUS_ANSWERS.map((a) => (
        <Button
          key={a}
          variant="outline"
          className="h-auto justify-start py-3 text-start"
          disabled={pending}
          onClick={() => answer(a)}
        >
          {t(`answer_${a}`)}
        </Button>
      ))}
    </div>
    {/* Report BS-64: "make it easy to turn off" — one click stops the monthly ping. */}
    <button
      type="button"
      disabled={pending}
      onClick={() => answer('not_looking')}
      className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      {t('stop_asking')}
    </button>
    </>
  )
}
