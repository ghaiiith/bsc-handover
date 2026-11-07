'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  clearMetaCapiToken,
  saveMarketingSettings,
  type MarketingSettingsInput,
} from '@/lib/admin/admin-settings-actions'

type FormState = Omit<MarketingSettingsInput, 'meta_capi_access_token'>

export default function MarketingSettingsForm({
  locale,
  initial,
  capiTokenSet,
}: {
  locale: string
  initial: FormState
  capiTokenSet: boolean
}) {
  const t = useTranslations('admin_marketing')
  const router = useRouter()
  const [pending, start] = useTransition()
  const [form, setForm] = useState<FormState>(initial)
  const [capiToken, setCapiToken] = useState('')
  const set = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))
  const setCopy = (p: Partial<FormState['lead_popup_copy']>) =>
    setForm((f) => ({ ...f, lead_popup_copy: { ...f.lead_popup_copy, ...p } }))

  const save = () =>
    start(async () => {
      const res = await saveMarketingSettings({ ...form, meta_capi_access_token: capiToken }, locale)
      if (res.error) {
        toast.error(res.field ? t('invalid_field', { field: t(`f_${res.field}`) }) : t('save_failed'))
        return
      }
      setCapiToken('')
      toast.success(t('saved'))
      router.refresh()
    })

  const clearToken = () =>
    start(async () => {
      const res = await clearMetaCapiToken(locale)
      if (res.error) toast.error(t('save_failed'))
      else {
        toast.success(t('token_cleared'))
        router.refresh()
      }
    })

  const field = (key: keyof FormState, extra?: { placeholder?: string; hint?: string; dir?: 'ltr' | 'rtl' }) => (
    <div className="space-y-1.5">
      <Label>{t(`f_${key}`)}</Label>
      <Input
        dir={extra?.dir ?? 'ltr'}
        placeholder={extra?.placeholder}
        value={String(form[key] ?? '')}
        onChange={(e) => set({ [key]: e.target.value } as Partial<FormState>)}
      />
      {extra?.hint && <p className="text-xs text-muted-foreground">{extra.hint}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">{t('sec_google')}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field('gtm_container_id', { placeholder: 'GTM-XXXXXXX', hint: t('h_gtm') })}
          {field('ga4_measurement_id', { placeholder: 'G-XXXXXXXXXX', hint: t('h_ga4') })}
          {field('google_site_verification', { placeholder: 'abc123…', hint: t('h_gsc') })}
          {field('clarity_project_id', { placeholder: 'abcd1234ef', hint: t('h_clarity') })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('sec_meta')}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field('meta_pixel_id', { placeholder: '1234567890123456', hint: t('h_pixel') })}
          {field('meta_domain_verification', { placeholder: 'abc123…', hint: t('h_meta_domain') })}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {t('f_meta_capi_access_token')}
              {capiTokenSet && <span className="text-xs font-normal text-emerald-600">{t('token_set')}</span>}
            </Label>
            <div className="flex gap-2">
              <Input
                dir="ltr"
                type="password"
                autoComplete="off"
                placeholder={capiTokenSet ? '••••••••  ' + t('token_keep') : 'EAAB…'}
                value={capiToken}
                onChange={(e) => setCapiToken(e.target.value)}
              />
              {capiTokenSet && (
                <Button type="button" variant="outline" size="icon" onClick={clearToken} disabled={pending} title={t('token_clear')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('h_capi')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('sec_leads')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field('lead_notify_emails', { placeholder: 'sales@bs-platform.com, manager@…', hint: t('h_notify') })}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>{t('f_lead_popup_enabled')}</Label>
              <p className="text-xs text-muted-foreground">{t('h_popup')}</p>
            </div>
            <Switch checked={form.lead_popup_enabled} onCheckedChange={(v) => set({ lead_popup_enabled: v })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>{t('popup_title_ar')}</Label><Input dir="rtl" value={form.lead_popup_copy?.title_ar ?? ''} onChange={(e) => setCopy({ title_ar: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('popup_title_en')}</Label><Input value={form.lead_popup_copy?.title_en ?? ''} onChange={(e) => setCopy({ title_en: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('popup_body_ar')}</Label><Input dir="rtl" value={form.lead_popup_copy?.body_ar ?? ''} onChange={(e) => setCopy({ body_ar: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('popup_body_en')}</Label><Input value={form.lead_popup_copy?.body_en ?? ''} onChange={(e) => setCopy({ body_en: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t('save')}
        </Button>
      </div>
    </div>
  )
}
