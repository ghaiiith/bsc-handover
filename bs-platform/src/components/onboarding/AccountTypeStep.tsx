'use client'

import { useTranslations } from 'next-intl'
import SelectableCard from '@/components/onboarding/SelectableCard'
import { ACCOUNT_TYPE_OPTIONS } from '@/components/onboarding/onboarding-options'
import type { OnboardingAccountType } from '@/types/onboarding'

interface AccountTypeStepProps {
  value: OnboardingAccountType | null
  onChange: (value: OnboardingAccountType) => void
}

export default function AccountTypeStep({ value, onChange }: AccountTypeStepProps) {
  const t = useTranslations('onboarding_flow')

  return (
    <div className="space-y-3">
      {ACCOUNT_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon
        return (
          <SelectableCard
            key={option.value}
            selected={value === option.value}
            onSelect={() => onChange(option.value)}
            title={t(option.labelKey)}
            description={option.descKey ? t(option.descKey) : undefined}
            icon={Icon ? <Icon className="size-5" /> : undefined}
          />
        )
      })}
    </div>
  )
}
