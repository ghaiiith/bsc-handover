'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  saveHomepageBanners,
  saveHomepageCompanies,
  uploadHomepageImage,
} from '@/lib/admin/admin-settings-actions'
import type { HomepageBanner } from '@/lib/admin/platform-settings'

interface Company {
  name: string
  name_ar?: string
  logo_url?: string
  link?: string
}

function ImageUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const t = useTranslations('admin_homepage')
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (file: File) => {
    setBusy(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadHomepageImage(fd)
    setBusy(false)
    if (res.url) onChange(res.url)
    else toast.error(t('upload_failed'))
  }
  return (
    <div className="flex items-center gap-2">
      {value && (
        <Image src={value} alt="" width={64} height={36} className="h-9 w-16 rounded object-cover" />
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
      />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </Button>
    </div>
  )
}

// Report BS-73/74: admin manages homepage banner slides + picked companies.
export default function HomepageBannerManager({
  initialBanners,
  initialCompanies,
}: {
  initialBanners: HomepageBanner[]
  initialCompanies: Company[]
}) {
  const locale = useLocale()
  const t = useTranslations('admin_homepage')
  const [banners, setBanners] = useState<HomepageBanner[]>(initialBanners)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [pending, startTransition] = useTransition()

  const updateBanner = (i: number, patch: Partial<HomepageBanner>) =>
    setBanners((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, dir: -1 | 1) =>
    setBanners((b) => {
      const j = i + dir
      if (j < 0 || j >= b.length) return b
      const copy = [...b]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy.map((x, k) => ({ ...x, order: k }))
    })

  const saveBanners = () =>
    startTransition(async () => {
      const res = await saveHomepageBanners(
        banners.map((b, i) => ({ ...b, order: i })),
        locale
      )
      toast[res.success ? 'success' : 'error'](
        res.success
          ? t('saved')
          : res.error === 'banner_image_required'
            ? t('banner_image_required')
            : t('save_failed')
      )
    })
  const saveCompanies = () =>
    startTransition(async () => {
      const res = await saveHomepageCompanies(companies, locale)
      toast[res.success ? 'success' : 'error'](
        res.success
          ? t('saved')
          : res.error === 'banner_image_required'
            ? t('banner_image_required')
            : t('save_failed')
      )
    })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{t('banners_title')}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setBanners((b) => [
                ...b,
                { id: String(Date.now()), image_url: '', title: '', title_ar: '', text: '', text_ar: '', link: '', enabled: true, order: b.length },
              ])
            }
          >
            <Plus className="me-1 h-4 w-4" /> {t('banner_add')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {banners.length === 0 && <p className="text-sm text-muted-foreground">{t('banners_empty')}</p>}
          {banners.map((b, i) => (
            <div key={b.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <ImageUpload value={b.image_url} onChange={(url) => updateBanner(i, { image_url: url })} />
                <div className="flex items-center gap-1">
                  <Switch checked={b.enabled} onCheckedChange={(v) => updateBanner(i, { enabled: v })} />
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setBanners((x) => x.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder={t('title_en')} value={b.title ?? ''} onChange={(e) => updateBanner(i, { title: e.target.value })} />
                <Input placeholder={t('title_ar')} value={b.title_ar ?? ''} onChange={(e) => updateBanner(i, { title_ar: e.target.value })} />
                <Input placeholder={t('text_en')} value={b.text ?? ''} onChange={(e) => updateBanner(i, { text: e.target.value })} />
                <Input placeholder={t('text_ar')} value={b.text_ar ?? ''} onChange={(e) => updateBanner(i, { text_ar: e.target.value })} />
                <Input placeholder={t('link_optional')} value={b.link ?? ''} onChange={(e) => updateBanner(i, { link: e.target.value })} className="sm:col-span-2" />
              </div>
            </div>
          ))}
          <Button type="button" disabled={pending} onClick={saveBanners}>
            {t('save_banners')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{t('companies_title')}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCompanies((c) => [...c, { name: '', name_ar: '', logo_url: '', link: '' }])}
          >
            <Plus className="me-1 h-4 w-4" /> {t('company_add')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {companies.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('companies_empty')}</p>
          )}
          {companies.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
              <ImageUpload
                value={c.logo_url ?? ''}
                onChange={(url) => setCompanies((x) => x.map((y, j) => (j === i ? { ...y, logo_url: url } : y)))}
              />
              <Input placeholder={t('name_en')} value={c.name} onChange={(e) => setCompanies((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} className="w-40" />
              <Input placeholder={t('name_ar')} value={c.name_ar ?? ''} onChange={(e) => setCompanies((x) => x.map((y, j) => (j === i ? { ...y, name_ar: e.target.value } : y)))} className="w-40" />
              <Input placeholder={t('link')} value={c.link ?? ''} onChange={(e) => setCompanies((x) => x.map((y, j) => (j === i ? { ...y, link: e.target.value } : y)))} className="w-40" />
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setCompanies((x) => x.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" disabled={pending} onClick={saveCompanies}>
            {t('save_companies')}
          </Button>
        </CardContent>
      </Card>

      <div>
        <Label className="text-xs text-muted-foreground">
          {t('hint')}
        </Label>
      </div>
    </div>
  )
}
