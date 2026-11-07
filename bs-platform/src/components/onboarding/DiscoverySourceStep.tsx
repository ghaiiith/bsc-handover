'use client'

import { useTranslations } from 'next-intl'
import SelectableCard from '@/components/onboarding/SelectableCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DISCOVERY_SOURCE_OPTIONS } from '@/components/onboarding/onboarding-options'
import type { DiscoverySource } from '@/types/onboarding'

interface DiscoverySourceStepProps {
  value: DiscoverySource | null
  otherText: string
  onChangeSource: (source: DiscoverySource) => void
  onChangeOther: (text: string) => void
}

export default function DiscoverySourceStep({
  value,
  otherText,
  onChangeSource,
  onChangeOther,
}: DiscoverySourceStepProps) {
  const t = useTranslations('onboarding_flow')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DISCOVERY_SOURCE_OPTIONS.map((option) => (
          <SelectableCard
            key={option.value}
            selected={value === option.value}
            onSelect={() => onChangeSource(option.value)}
            title={t(option.labelKey)}
            className="min-h-[52px] p-3"
          />
        ))}
      </div>
      {value === 'other' ? (
        <div className="space-y-1.5">
          <Label htmlFor="discovery_other">{t('discovery_other_label')}</Label>
          <Input
            id="discovery_other"
            value={otherText}
            onChange={(e) => onChangeOther(e.target.value)}
            placeholder={t('discovery_other_placeholder')}
            maxLength={120}
          />
        </div>
      ) : null}
    </div>
  )
}
