'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { toggleSavedJob } from '@/lib/jobs/saved-jobs'

interface SaveJobButtonProps {
  jobId: string
  locale: string
  initialSaved: boolean
  variant?: 'button' | 'icon'
}

export default function SaveJobButton({
  jobId,
  locale,
  initialSaved,
  variant = 'button',
}: SaveJobButtonProps) {
  const t = useTranslations('jobs')
  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !saved
    setSaved(next) // optimistic
    startTransition(async () => {
      const res = await toggleSavedJob(jobId, locale)
      if (!res.success) {
        setSaved(!next)
        toast.error(t('save_error'))
        return
      }
      setSaved(res.saved)
    })
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={saved ? t('saved') : t('save_job')}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border transition',
          saved ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
        )}
      >
        <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition',
        saved ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
      )}
    >
      <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
      {saved ? t('saved') : t('save_job')}
    </button>
  )
}
