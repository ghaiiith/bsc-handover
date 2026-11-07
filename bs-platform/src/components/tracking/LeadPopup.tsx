'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { X, Gift, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { trackEvent } from '@/lib/tracking/track-event'

interface Copy {
  title_ar?: string
  title_en?: string
  body_ar?: string
  body_en?: string
}

const DISMISS_KEY = 'bs_lead_popup_dismissed'
const DISMISS_DAYS = 7

/**
 * Marketing request item 6: catch a hesitant visitor before they leave a
 * course or service page.
 *
 * Triggers on exit intent (mouse leaves through the top on desktop) or, on
 * touch devices where there is no exit intent, after 45 seconds on the page.
 * Shown at most once a week per browser, never to a signed-in user, and the
 * copy is edited by the admin. Submissions land in the same lead table as the
 * growth-guide form.
 */
export default function LeadPopup({ copy, isLoggedIn }: { copy: Copy; isLoggedIn: boolean }) {
  const t = useTranslations('lead_popup')
  const locale = useLocale()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', whatsapp: '' })
  const shown = useRef(false)

  useEffect(() => {
    if (isLoggedIn) return
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
      if (until > Date.now()) return
    } catch {
      /* ignore */
    }

    const show = () => {
      if (shown.current) return
      shown.current = true
      setOpen(true)
    }
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show()
    }
    document.addEventListener('mouseout', onLeave)
    const timer = window.setTimeout(show, 45_000)
    return () => {
      document.removeEventListener('mouseout', onLeave)
      window.clearTimeout(timer)
    }
  }, [isLoggedIn])

  const dismiss = () => {
    setOpen(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000))
    } catch {
      /* ignore */
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/leads/popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, page: pathname, locale }),
      })
      if (res.ok) {
        trackEvent('popup_lead_submit', { page: pathname })
        setDone(true)
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now() + 90 * 86_400_000))
        } catch {
          /* ignore */
        }
      }
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null
  const isAr = locale === 'ar'
  const title = (isAr ? copy.title_ar : copy.title_en) || t('title')
  const body = (isAr ? copy.body_ar : copy.body_en) || t('body')

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
        <button type="button" onClick={dismiss} className="absolute end-3 top-3 rounded-full p-1 hover:bg-muted" aria-label={t('close')}>
          <X className="h-4 w-4" />
        </button>
        {done ? (
          <div className="py-6 text-center">
            <Gift className="mx-auto mb-3 h-10 w-10 text-primary" />
            <p className="text-lg font-bold">{t('thanks')}</p>
            <Button className="mt-4" onClick={dismiss}>{t('close')}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Gift className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-bold leading-snug">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
            <Input required placeholder={t('name')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input required type="email" dir="ltr" placeholder={t('email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input required type="tel" dir="ltr" placeholder={t('whatsapp')} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('submit')}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">{t('privacy')}</p>
          </form>
        )}
      </div>
    </div>
  )
}
