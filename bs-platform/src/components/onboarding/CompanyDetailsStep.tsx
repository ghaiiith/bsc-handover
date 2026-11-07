'use client'

import { useTranslations } from 'next-intl'
import SelectableCard from '@/components/onboarding/SelectableCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  COMPANY_GOAL_OPTIONS,
  COMPANY_SIZE_OPTIONS,
} from '@/components/onboarding/onboarding-options'
import type { CompanyGoal, CompanySize } from '@/types/onboarding'

export interface CompanyDetailsValue {
  company_intent: CompanyGoal | null
  company_name: string
  company_industry: string
  company_size: CompanySize | null
  company_website: string
  company_linkedin: string
}

interface CompanyDetailsStepProps {
  value: CompanyDetailsValue
  onChange: (value: CompanyDetailsValue) => void
}

export default function CompanyDetailsStep({ value, onChange }: CompanyDetailsStepProps) {
  const t = useTranslations('onboarding_flow')

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold">{t('company_goal_title')}</h2>
        <div className="space-y-2">
          {COMPANY_GOAL_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <SelectableCard
                key={option.value}
                selected={value.company_intent === option.value}
                onSelect={() => onChange({ ...value, company_intent: option.value })}
                title={t(option.labelKey)}
                icon={Icon ? <Icon className="size-5" /> : undefined}
              />
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="company_name">{t('company_name_label')}</Label>
          <Input
            id="company_name"
            value={value.company_name}
            onChange={(e) => onChange({ ...value, company_name: e.target.value })}
            placeholder={t('company_name_placeholder')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company_industry">{t('company_industry_label')}</Label>
          <Input
            id="company_industry"
            value={value.company_industry}
            onChange={(e) => onChange({ ...value, company_industry: e.target.value })}
            placeholder={t('company_industry_placeholder')}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t('company_size_title')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {COMPANY_SIZE_OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              selected={value.company_size === option.value}
              onSelect={() => onChange({ ...value, company_size: option.value })}
              title={t(option.labelKey)}
              className="min-h-[56px] p-3"
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('company_links_title')}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="company_website">{t('company_website_label')}</Label>
          <Input
            id="company_website"
            type="url"
            value={value.company_website}
            onChange={(e) => onChange({ ...value, company_website: e.target.value })}
            placeholder="https://"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company_linkedin">{t('company_linkedin_label')}</Label>
          <Input
            id="company_linkedin"
            type="url"
            value={value.company_linkedin}
            onChange={(e) => onChange({ ...value, company_linkedin: e.target.value })}
            placeholder="https://linkedin.com/company/..."
          />
        </div>
      </section>
    </div>
  )
}
