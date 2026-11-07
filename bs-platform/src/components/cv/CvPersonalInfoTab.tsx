'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IRAQI_CITIES, IRAQI_CITIES_EN } from '@/lib/constants'
import type { CVFormData } from '@/types/cv'

interface CvPersonalInfoTabProps {
  form: CVFormData
  onChange: (patch: Partial<CVFormData>) => void
}

export default function CvPersonalInfoTab({ form, onChange }: CvPersonalInfoTabProps) {
  const t = useTranslations('cv')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const p = form.personalInfo

  const updatePersonal = (field: keyof typeof p, value: string) => {
    onChange({ personalInfo: { ...p, [field]: value } })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">{t('note_cv_only')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>{t('personal_info')} — Name</Label>
          <Input value={p.name} onChange={(e) => updatePersonal('name', e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Headline</Label>
          <Input value={p.headline} onChange={(e) => updatePersonal('headline', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={p.email} onChange={(e) => updatePersonal('email', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={p.phone} onChange={(e) => updatePersonal('phone', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Select value={p.city} onValueChange={(v) => updatePersonal('city', v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
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
        <div className="space-y-2 sm:col-span-2">
          <Label>LinkedIn</Label>
          <Input value={p.linkedin} onChange={(e) => updatePersonal('linkedin', e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>GitHub</Label>
          <Input value={p.github} onChange={(e) => updatePersonal('github', e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Website</Label>
          <Input value={p.website} onChange={(e) => updatePersonal('website', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
