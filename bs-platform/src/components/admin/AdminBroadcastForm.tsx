'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Audience = 'all' | 'student' | 'instructor' | 'company' | 'freelancer' | 'admin'

const AUDIENCES: Audience[] = ['all', 'student', 'instructor', 'company', 'freelancer', 'admin']

export default function AdminBroadcastForm() {
  const t = useTranslations('admin')
  const [titleAr, setTitleAr] = useState('')
  const [title, setTitle] = useState('')
  const [bodyAr, setBodyAr] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [submitting, setSubmitting] = useState(false)

  const disabled =
    submitting || !titleAr.trim() || !title.trim() || !bodyAr.trim() || !body.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, titleAr, body, bodyAr, audience }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(t('broadcast_error'))
        return
      }
      toast.success(t('broadcast_sent', { count: data.recipients ?? 0 }))
      setTitleAr('')
      setTitle('')
      setBodyAr('')
      setBody('')
      setAudience('all')
    } catch {
      toast.error(t('broadcast_error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('broadcast_audience')}</label>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                audience === a
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {t(`broadcast_audience_${a}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('broadcast_title_ar')}</label>
          <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" maxLength={120} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('broadcast_title_en')}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} dir="ltr" maxLength={120} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('broadcast_body_ar')}</label>
          <textarea
            value={bodyAr}
            onChange={(e) => setBodyAr(e.target.value)}
            dir="rtl"
            maxLength={1000}
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('broadcast_body_en')}</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            dir="ltr"
            maxLength={1000}
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <Button type="submit" disabled={disabled}>
        {submitting ? t('broadcast_sending') : t('broadcast_send')}
      </Button>
    </form>
  )
}
