'use client'

import { useTranslations } from 'next-intl'
import { Globe, Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProfileFormState, ProfileLinks } from '@/types/profile'

interface ProfileLinksSectionProps {
  form: ProfileFormState
  onChange: (patch: Partial<ProfileFormState>) => void
}

const linkFields: Array<{
  key: keyof ProfileLinks
  icon: typeof Globe
  labelKey: 'linkedin' | 'github' | 'website' | 'twitter'
}> = [
  { key: 'linkedin', icon: Link2, labelKey: 'linkedin' },
  { key: 'github', icon: Link2, labelKey: 'github' },
  { key: 'website', icon: Globe, labelKey: 'website' },
  { key: 'twitter', icon: Link2, labelKey: 'twitter' },
]

export default function ProfileLinksSection({ form, onChange }: ProfileLinksSectionProps) {
  const t = useTranslations('profile')

  const updateLink = (key: keyof ProfileLinks, value: string) => {
    onChange({
      links: {
        ...form.links,
        [key]: value || undefined,
      },
    })
  }

  return (
    <Card id="links" className="edu-card shadow-none scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-base">{t('links')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkFields.map(({ key, icon: Icon, labelKey }) => {
          const value = form.links[key] ?? ''
          return (
            <div key={key} className="space-y-2">
              <Label className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </Label>
              <Input
                value={value}
                placeholder="https://"
                onChange={(e) => updateLink(key, e.target.value)}
              />
              {value.startsWith('https://') && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-primary truncate max-w-full rounded-full border px-3 py-1"
                >
                  {value}
                </a>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
