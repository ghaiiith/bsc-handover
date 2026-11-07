'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IRAQI_CITIES, IRAQI_CITIES_EN } from '@/lib/constants'
import { COMMUNITY_CATEGORIES } from '@/lib/community/constants'
import { MAX_AVATAR_BYTES } from '@/lib/profile/profile-constants'

export interface RoleCategoryOption {
  value: string
  label: string
  labelEn: string
  emoji: string
}
import type { ProfileFormState } from '@/types/profile'
import { toast } from 'sonner'

interface ProfileBasicSectionProps {
  locale: string
  form: ProfileFormState
  userId: string
  onChange: (patch: Partial<ProfileFormState>) => void
  /** Admin-editable role categories (report BS-19); falls back to built-ins. */
  roleCategories?: RoleCategoryOption[]
}

const DEFAULT_ROLE_CATEGORIES: RoleCategoryOption[] = COMMUNITY_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
  labelEn: c.labelEn,
  emoji: c.emoji,
}))

export default function ProfileBasicSection({
  locale,
  form,
  userId,
  onChange,
  roleCategories,
}: ProfileBasicSectionProps) {
  const t = useTranslations('profile')
  const isAr = locale === 'ar'
  const categories = roleCategories && roleCategories.length > 0 ? roleCategories : DEFAULT_ROLE_CATEGORIES
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('avatar_invalid_type'))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t('avatar_too_large'))
      return
    }

    setUploading(true)
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${userId}/avatar.${ext}`

    const supabase = createClient()
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
    })

    setUploading(false)
    if (error) {
      toast.error(t('avatar_upload_failed'))
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    onChange({ avatar_url: `${data.publicUrl}?t=${Date.now()}` })
  }

  const initials = form.full_name?.charAt(0) || '?'

  return (
    <Card id="basic" className="edu-card shadow-none scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-base">{t('basic_info')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative group"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage src={form.avatar_url} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleAvatarUpload(file)
            }}
          />
          <p className="text-sm text-muted-foreground">{t('avatar_hint')}</p>
        </div>

        {/* BS-27: both names are mandatory. The bindings were previously swapped —
            the app displays `full_name_ar` in Arabic and `full_name` otherwise. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {t('name_ar')} <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={form.full_name_ar}
              onChange={(e) => onChange({ full_name_ar: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {t('name_en')} <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => onChange({ full_name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            {t('headline')} <span className="text-destructive">*</span>
          </Label>
          <Input
            required
            value={form.headline}
            maxLength={100}
            placeholder={t('headline_placeholder')}
            onChange={(e) => onChange({ headline: e.target.value })}
          />
          <p className="text-xs text-muted-foreground num-en text-end">
            {form.headline.length}/100
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('phone')}</Label>
            <Input
              value={form.phone}
              className="num-en"
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {t('location')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.location}
              onValueChange={(v) => onChange({ location: v ?? '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('location_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {IRAQI_CITIES.map((cityAr, i) => (
                  <SelectItem key={cityAr} value={isAr ? cityAr : IRAQI_CITIES_EN[i]}>
                    {isAr ? cityAr : IRAQI_CITIES_EN[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('years_experience')}</Label>
            <Input
              type="number"
              min={0}
              max={50}
              className="num-en"
              value={form.years_of_experience ?? ''}
              onChange={(e) =>
                onChange({
                  years_of_experience: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              {t('preferred_role')} <span className="text-destructive">*</span>
            </Label>
            {/* Controlled list tied to the Community categories so profiles match
                their category on the Community tab (report BS-19). */}
            <Select
              value={form.preferred_role || undefined}
              onValueChange={(v) => onChange({ preferred_role: v ?? '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('preferred_role_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.emoji} {isAr ? cat.label : cat.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Report BS-61: explicit three-state availability. The boolean the
            matching queries use is derived from this on save. */}
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t('availability_label')}</p>
              <p className="text-xs text-muted-foreground">{t('open_to_work_hint')}</p>
            </div>
            {(form.availability_status ?? (form.availability ? 'open_to_work' : 'not_looking')) !==
              'not_looking' && (
              <Badge className="bg-green-600 hover:bg-green-600">{t('open_badge')}</Badge>
            )}
          </div>
          <Select
            value={form.availability_status ?? (form.availability ? 'open_to_work' : 'not_looking')}
            onValueChange={(v) => {
              if (!v) return
              const next = v as 'open_to_work' | 'open_to_offers' | 'not_looking'
              onChange({ availability_status: next, availability: next !== 'not_looking' })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open_to_work">{t('availability_open_to_work')}</SelectItem>
              <SelectItem value="open_to_offers">{t('availability_open_to_offers')}</SelectItem>
              <SelectItem value="not_looking">{t('availability_not_looking')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report BS-82: candidate controls whether companies can message them. */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">{t('accepts_messages')}</p>
            <p className="text-xs text-muted-foreground">{t('accepts_messages_hint')}</p>
          </div>
          <Switch
            checked={form.accepts_messages ?? true}
            onCheckedChange={(v) => onChange({ accepts_messages: v })}
          />
        </div>

        {/* Report BS-65: optional expected salary — never required, not part of
            completion, visibility controlled by the candidate. */}
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">{t('expected_salary')}</p>
            <p className="text-xs text-muted-foreground">{t('expected_salary_hint')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={t('expected_salary_amount_placeholder')}
              value={form.expected_salary_amount ?? ''}
              onChange={(e) =>
                onChange({
                  expected_salary_amount:
                    e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
            />
            <Select
              value={form.expected_salary_currency ?? 'IQD'}
              onValueChange={(v) => v && onChange({ expected_salary_currency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IQD">IQD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={form.expected_salary_period ?? 'monthly'}
              onValueChange={(v) =>
                onChange({ expected_salary_period: v as 'monthly' | 'yearly' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t('salary_monthly')}</SelectItem>
                <SelectItem value="yearly">{t('salary_yearly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-2 text-xs text-muted-foreground">
            {t('expected_salary_public')}
            <Switch
              checked={form.expected_salary_public ?? true}
              onCheckedChange={(v) => onChange({ expected_salary_public: v })}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
