'use client'

import { getCompanyProfileCompletion } from '@/lib/profile/completion'
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import { Building2, Loader2, Save, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { saveCompanyProfile } from '@/lib/company/company-profile-actions'
import {
  type CompanyProfileInput,
} from '@/lib/company/company-profile'
import {
  COMPANY_TYPES,
  COMPANY_SECTORS,
  COMPANY_SIZES,
  IRAQI_GOVERNORATES,
  COMPANY_BENEFITS,
  CONTACT_METHODS,
  VERIFICATION_TIERS,
  type Option,
} from '@/lib/company/company-constants'

interface CompanyProfileFormProps {
  locale: string
  userId: string
  initial: CompanyProfileInput
  verificationStatus?: string
}

export default function CompanyProfileForm({
  locale,
  userId,
  initial,
  verificationStatus = 'unverified',
}: CompanyProfileFormProps) {
  const t = useTranslations('company_profile')
  const uiLocale = useLocale()
  const isAr = uiLocale === 'ar'
  const router = useRouter()
  const [form, setForm] = useState<CompanyProfileInput>(initial)
  const [pending, startTransition] = useTransition()

  const set = (patch: Partial<CompanyProfileInput>) => setForm((p) => ({ ...p, ...patch }))
  // BS-90: same function the dashboard shell uses, so the two agree.
  const score = getCompanyProfileCompletion(form)
  const tier = VERIFICATION_TIERS[verificationStatus] ?? VERIFICATION_TIERS.unverified

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveCompanyProfile(form, locale)
      if (!res.ok) {
        toast.error(res.error === 'validation_failed' ? t('validation_error') : t('save_error'))
        return
      }
      toast.success(res.complete ? t('saved_complete') : t('saved'))
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
          <span className="mt-1 inline-block rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            {t('verification')}: {isAr ? tier.ar : tier.en}
          </span>
        </div>
        <div className="text-end">
          <div className="num-en text-2xl font-bold text-primary">{score}%</div>
          <div className="text-xs text-muted-foreground">{t('completion')}</div>
        </div>
      </div>

      {/* ---------- Identity ---------- */}
      <Section title={t('sec_identity')}>
        <div className="flex items-center gap-4">
          <LogoUploader
            userId={userId}
            value={form.company_logo_url}
            onChange={(url) => set({ company_logo_url: url })}
            t={t}
          />
        </div>
        <Grid2>
          <Field label={t('name_ar')} required>
            <Input value={form.company_name_ar} onChange={(e) => set({ company_name_ar: e.target.value })} dir="rtl" />
          </Field>
          <Field label={t('name_en')} required>
            <Input value={form.company_name} onChange={(e) => set({ company_name: e.target.value })} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label={t('company_type')} required>
            <SelectOpt options={COMPANY_TYPES} value={form.company_type} isAr={isAr}
              onChange={(v) => set({ company_type: v })} />
          </Field>
          <Field label={t('sector')} required>
            <SelectOpt options={COMPANY_SECTORS} value={form.company_industry} isAr={isAr}
              onChange={(v) => set({ company_industry: v })} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label={t('size')} required>
            <SelectOpt options={COMPANY_SIZES} value={form.company_size} isAr={isAr}
              onChange={(v) => set({ company_size: v })} />
          </Field>
          <Field label={t('governorate')} required>
            <SelectOpt options={IRAQI_GOVERNORATES} value={form.company_governorate} isAr={isAr}
              onChange={(v) => set({ company_governorate: v })} />
          </Field>
        </Grid2>
        <Field label={t('city')} required>
          <Input value={form.company_city} onChange={(e) => set({ company_city: e.target.value })} />
        </Field>
      </Section>

      {/* ---------- About ---------- */}
      <Section title={t('sec_about')}>
        <Field label={t('description')} required>
          <Textarea rows={5} value={form.company_description}
            onChange={(e) => set({ company_description: e.target.value })}
            placeholder={t('description_placeholder')} dir="rtl" />
          <p className="num-en mt-1 text-xs text-muted-foreground">
            {(form.company_description ?? '').trim().length} / 100+
          </p>
        </Field>
        <Field label={t('description_en')}>
          <Textarea rows={4} value={form.company_description_en}
            onChange={(e) => set({ company_description_en: e.target.value })} />
        </Field>
        <Grid2>
          <Field label={t('tagline')}>
            <Input value={form.company_tagline} onChange={(e) => set({ company_tagline: e.target.value })} maxLength={80} />
          </Field>
          <Field label={t('year_founded')}>
            <Input type="number" className="num-en" value={form.company_year_founded ?? ''}
              onChange={(e) => set({ company_year_founded: e.target.value ? parseInt(e.target.value, 10) : null })} />
          </Field>
        </Grid2>
        <Field label={t('website')}>
          <Input value={form.company_website} onChange={(e) => set({ company_website: e.target.value })} placeholder="https://" />
        </Field>
        <Grid2>
          <Field label="LinkedIn">
            <Input value={form.company_socials?.linkedin ?? ''}
              onChange={(e) => set({ company_socials: { ...form.company_socials, linkedin: e.target.value } })} />
          </Field>
          <Field label="Instagram">
            <Input value={form.company_socials?.instagram ?? ''}
              onChange={(e) => set({ company_socials: { ...form.company_socials, instagram: e.target.value } })} />
          </Field>
        </Grid2>
      </Section>

      {/* ---------- HR contact ---------- */}
      <Section title={t('sec_hr')}>
        <p className="text-xs text-muted-foreground">{t('hr_private_note')}</p>
        <Grid2>
          <Field label={t('hr_name')} required>
            <Input value={form.company_hr_name} onChange={(e) => set({ company_hr_name: e.target.value })} />
          </Field>
          <Field label={t('hr_role')} required>
            <Input value={form.company_hr_role} onChange={(e) => set({ company_hr_role: e.target.value })} placeholder={t('hr_role_placeholder')} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label={t('hr_email')} required>
            <Input type="email" value={form.company_hr_email} onChange={(e) => set({ company_hr_email: e.target.value })} />
          </Field>
          <Field label={t('hr_phone')}>
            <Input className="num-en" value={form.company_hr_phone} onChange={(e) => set({ company_hr_phone: e.target.value })} />
          </Field>
        </Grid2>
        <Field label={t('preferred_contact')}>
          <SelectOpt options={CONTACT_METHODS} value={form.company_hr_preferred_contact} isAr={isAr}
            onChange={(v) => set({ company_hr_preferred_contact: v })} />
        </Field>
        <Field label={t('hiring_roles')}>
          <TagInput values={form.company_hiring_roles ?? []} onChange={(v) => set({ company_hiring_roles: v })}
            placeholder={t('hiring_roles_placeholder')} />
        </Field>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{t('hires_grads')}</p>
            <p className="text-xs text-muted-foreground">{t('hires_grads_hint')}</p>
          </div>
          <Switch checked={!!form.company_hires_grads}
            onCheckedChange={(v) => set({ company_hires_grads: v })} />
        </div>
      </Section>

      {/* ---------- Employer brand ---------- */}
      <Section title={t('sec_brand')}>
        <Field label={t('benefits')}>
          <ChipsSelect options={COMPANY_BENEFITS} values={form.company_benefits ?? []} isAr={isAr}
            onChange={(v) => set({ company_benefits: v })} />
        </Field>
        <Field label={t('working_hours')}>
          <Input value={form.company_working_hours} onChange={(e) => set({ company_working_hours: e.target.value })}
            placeholder={t('working_hours_placeholder')} />
        </Field>
        <Field label={t('culture')}>
          <Textarea rows={3} value={form.company_culture_blurb}
            onChange={(e) => set({ company_culture_blurb: e.target.value })} dir="rtl" />
        </Field>
        <Field label={t('workplace_photos')}>
          <PhotoUploader userId={userId} values={form.company_workplace_photos ?? []}
            onChange={(v) => set({ company_workplace_photos: v })} t={t} />
        </Field>
      </Section>

      {/* ---------- Academy ---------- */}
      <Section title={t('sec_academy')}>
        <p className="text-xs text-muted-foreground">{t('academy_hint')}</p>
        <Grid2>
          <Field label={t('academy_seats')}>
            <Input type="number" className="num-en" value={form.company_academy_seats ?? ''}
              onChange={(e) => set({ company_academy_seats: e.target.value ? parseInt(e.target.value, 10) : null })} />
          </Field>
          <div />
        </Grid2>
        <Field label={t('academy_departments')}>
          <TagInput values={form.company_academy_departments ?? []} onChange={(v) => set({ company_academy_departments: v })} />
        </Field>
        <Field label={t('academy_focus')}>
          <TagInput values={form.company_academy_focus ?? []} onChange={(v) => set({ company_academy_focus: v })} />
        </Field>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={pending} className="gap-2 shadow-lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('save')}
        </Button>
      </div>
    </div>
  )
}

/* ---------------- helpers ---------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}

function SelectOpt({
  options,
  value,
  onChange,
  isAr,
}: {
  options: Option[]
  value: string | undefined
  onChange: (v: string) => void
  isAr: boolean
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {isAr ? o.ar : o.en}
        </option>
      ))}
    </select>
  )
}

function ChipsSelect({
  options,
  values,
  onChange,
  isAr,
}: {
  options: Option[]
  values: string[]
  onChange: (v: string[]) => void
  isAr: boolean
}) {
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = values.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {isAr ? o.ar : o.en}
          </button>
        )
      })}
    </div>
  )
}

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={add}>
          +
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function LogoUploader({
  userId,
  value,
  onChange,
  t,
}: {
  userId: string
  value: string | undefined
  onChange: (url: string) => void
  t: (k: string) => string
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const upload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error(t('logo_invalid'))
    if (file.size > 3 * 1024 * 1024) return toast.error(t('logo_too_large'))
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'png'
    const path = `${userId}/company-logo.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    setUploading(false)
    if (error) return toast.error(t('logo_upload_failed'))
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    onChange(`${data.publicUrl}?t=${Date.now()}`)
  }
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-muted">
        {value ? (
          <Image src={value} alt="" fill className="object-cover" sizes="80px" />
        ) : (
          <Building2 className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div>
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f) }} />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => ref.current?.click()} className="gap-2">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {t('upload_logo')} <span className="text-destructive">*</span>
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">{t('logo_hint')}</p>
      </div>
    </div>
  )
}

function PhotoUploader({
  userId,
  values,
  onChange,
  t,
}: {
  userId: string
  values: string[]
  onChange: (v: string[]) => void
  t: (k: string) => string
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const upload = async (files: FileList) => {
    setUploading(true)
    const supabase = createClient()
    const added: string[] = []
    for (const file of Array.from(files).slice(0, 6)) {
      if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) continue
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/workplace/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
      const { error } = await supabase.storage.from('service-portfolio').upload(path, file, { upsert: true })
      if (!error) added.push(supabase.storage.from('service-portfolio').getPublicUrl(path).data.publicUrl)
    }
    setUploading(false)
    if (added.length) onChange([...values, ...added].slice(0, 6))
  }
  return (
    <div className="space-y-2">
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) void upload(e.target.files) }} />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => ref.current?.click()} className="gap-2">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {t('add_photos')}
      </Button>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url) => (
            <div key={url} className="relative h-16 w-24 overflow-hidden rounded border">
              <Image src={url} alt="" fill className="object-cover" sizes="96px" />
              <button type="button" onClick={() => onChange(values.filter((x) => x !== url))}
                className="absolute right-0 top-0 bg-black/50 p-0.5 text-white">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
