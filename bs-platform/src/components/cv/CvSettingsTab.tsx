'use client'

import { useTranslations } from 'next-intl'
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
import type { CVFormData, CvLanguage } from '@/types/cv'

interface CvSettingsTabProps {
  form: CVFormData
  onChange: (patch: Partial<CVFormData>) => void
}

export default function CvSettingsTab({ form, onChange }: CvSettingsTabProps) {
  const t = useTranslations('cv')
  const settings = form.settings

  const updateSettings = (patch: Partial<typeof settings>) => {
    onChange({ settings: { ...settings, ...patch } })
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label>{t('cv_name')}</Label>
        <Input
          value={settings.name}
          onChange={(e) => updateSettings({ name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('cv_language')}</Label>
        <Select
          value={settings.language}
          onValueChange={(v) => updateSettings({ language: v as CvLanguage })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ar">عربي</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label htmlFor="cv-default">{t('set_default')}</Label>
        <Switch
          id="cv-default"
          checked={settings.isDefault}
          onCheckedChange={(checked) => updateSettings({ isDefault: checked })}
        />
      </div>
    </div>
  )
}
