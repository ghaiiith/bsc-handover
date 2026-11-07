'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Download, Loader2, CheckCircle2, CalendarCheck } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { submitGrowthGuideLead } from '@/lib/landing/lead-actions'

/**
 * Section 6 of the wireframe — the opt-in form. On success the visitor gets the
 * guide immediately (no "check your email" dead end) and is pushed straight to
 * booking a call, which is Section 7's whole purpose.
 */
export default function LeadForm({ fallbackBookingUrl }: { fallbackBookingUrl: string }) {
  const t = useTranslations('growthGuide')
  const locale = useLocale() as 'ar' | 'en'
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<{ pdfUrl: string; bookingUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    job_title: '',
    whatsapp: '',
    email: '',
    company_size: '' as '' | '1-5' | '6-20' | '20+',
  })

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await submitGrowthGuideLead({
        full_name: form.full_name,
        job_title: form.job_title || undefined,
        whatsapp: form.whatsapp,
        email: form.email,
        company_size: form.company_size || undefined,
        locale,
      })
      if (!res.success) {
        setError(
          res.error === 'rate_limited'
            ? t('form_rate_limited')
            : res.error === 'validation_failed'
              ? t('form_invalid')
              : t('form_failed')
        )
        return
      }
      const pdfUrl = res.pdfUrl || ''
      const bookingUrl = res.bookingUrl || fallbackBookingUrl
      setDone({ pdfUrl, bookingUrl })
      // Start the download straight away when the file is configured.
      if (pdfUrl) window.open(pdfUrl, '_blank', 'noopener,noreferrer')
    })
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
          {t('success_title')}
        </h3>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
          {done.pdfUrl ? t('success_body') : t('success_body_no_file')}
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          {done.pdfUrl && (
            <a
              href={done.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
            >
              <Download className="h-4 w-4" />
              {t('success_download')}
            </a>
          )}
          {done.bookingUrl && (
            <a
              href={done.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'gap-2')}
            >
              <CalendarCheck className="h-4 w-4" />
              {t('cta_book_call')}
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-name">
            {t('field_name')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-name"
            required
            value={form.full_name}
            onChange={(e) => set({ full_name: e.target.value })}
            placeholder={t('field_name_ph')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-role">{t('field_role')}</Label>
          <Input
            id="lead-role"
            value={form.job_title}
            onChange={(e) => set({ job_title: e.target.value })}
            placeholder={t('field_role_ph')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-wa">
            {t('field_whatsapp')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-wa"
            required
            type="tel"
            inputMode="tel"
            dir="ltr"
            className="num-en text-start"
            value={form.whatsapp}
            onChange={(e) => set({ whatsapp: e.target.value })}
            placeholder="+964 7XX XXX XXXX"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">
            {t('field_email')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-email"
            required
            type="email"
            dir="ltr"
            className="text-start"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="name@company.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('field_size')}</Label>
        <Select
          value={form.company_size || undefined}
          onValueChange={(v) => v && set({ company_size: v as '1-5' | '6-20' | '20+' })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('field_size_ph')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1-5">1-5</SelectItem>
            <SelectItem value="6-20">6-20</SelectItem>
            <SelectItem value="20+">+20</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('field_size_hint')}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={pending} className="w-full gap-2 text-base">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        {t('form_submit')}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t('form_privacy')}</p>
    </form>
  )
}
