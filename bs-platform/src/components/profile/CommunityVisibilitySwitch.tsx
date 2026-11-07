'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

/**
 * Report BS-67: an explicit "Show me in the Community" switch on the profile.
 * Once the student passes the completion threshold they are listed automatically;
 * this is how they opt OUT. Backed by the same visibility flag the Community
 * query reads, so what the switch says is what the listing does.
 */
export default function CommunityVisibilitySwitch({ initial }: { initial: boolean }) {
  const t = useTranslations('community')
  const [on, setOn] = useState(initial)
  const [pending, startTransition] = useTransition()

  const toggle = (next: boolean) => {
    const previous = on
    setOn(next)
    startTransition(async () => {
      try {
        const res = await fetch('/api/portfolio/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portfolio_is_public: next }),
        })
        if (!res.ok) throw new Error('failed')
        toast.success(t('visibility_saved'))
      } catch {
        setOn(previous)
        toast.error(t('visibility_failed'))
      }
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{t('show_me_title')}</p>
        <p className="text-xs text-muted-foreground">{t('show_me_hint')}</p>
      </div>
      <Switch checked={on} onCheckedChange={toggle} disabled={pending} />
    </div>
  )
}
