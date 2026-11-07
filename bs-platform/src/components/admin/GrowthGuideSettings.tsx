'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { saveGrowthGuideSettings } from '@/lib/admin/admin-settings-actions'

/** Lets the owner point the landing page at the guide + booking link themselves. */
export default function GrowthGuideSettings({
  initial,
}: {
  initial: { pdfUrl: string; bookingUrl: string; authorPhoto: string }
}) {
  const t = useTranslations('admin_homepage')
  const locale = useLocale()
  const [form, setForm] = useState(initial)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      const res = await saveGrowthGuideSettings(form, locale)
      if (res.success) toast.success(t('saved'))
      else toast.error(res.error === 'invalid_url' ? t('guide_invalid_url') : t('save_failed'))
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('guide_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t('guide_hint')}</p>
        <div className="space-y-1.5">
          <Label>{t('guide_pdf')}</Label>
          <Input
            dir="ltr"
            placeholder="https://…/growth-guide.pdf"
            value={form.pdfUrl}
            onChange={(e) => setForm((f) => ({ ...f, pdfUrl: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('guide_booking')}</Label>
          <Input
            dir="ltr"
            placeholder="https://calendly.com/…"
            value={form.bookingUrl}
            onChange={(e) => setForm((f) => ({ ...f, bookingUrl: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('guide_photo')}</Label>
          <Input
            dir="ltr"
            placeholder="https://…/hassan.jpg"
            value={form.authorPhoto}
            onChange={(e) => setForm((f) => ({ ...f, authorPhoto: e.target.value }))}
          />
        </div>
        <Button type="button" disabled={pending} onClick={save}>
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  )
}
