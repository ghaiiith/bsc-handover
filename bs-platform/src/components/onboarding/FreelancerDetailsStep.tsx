'use client'

import { useTranslations } from 'next-intl'
import SelectableCard, { MultiSelectCard } from '@/components/onboarding/SelectableCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FREELANCER_AVAILABILITY_OPTIONS,
  FREELANCER_INTENT_OPTIONS,
  INTEREST_OPTIONS,
  SKILL_LEVEL_OPTIONS,
} from '@/components/onboarding/onboarding-options'
import { MAX_MULTI_SELECT } from '@/lib/onboarding/schema'
import type {
  FreelancerAvailability,
  FreelancerIntent,
  OnboardingInterest,
  OnboardingSkillLevel,
} from '@/types/onboarding'

export interface FreelancerDetailsValue {
  freelancer_intent: FreelancerIntent | null
  service_categories: OnboardingInterest[]
  skill_level: OnboardingSkillLevel | null
  availability: FreelancerAvailability | null
  professional_headline: string
  linkedin: string
  portfolio: string
  github: string
  website: string
}

interface FreelancerDetailsStepProps {
  value: FreelancerDetailsValue
  onChange: (value: FreelancerDetailsValue) => void
}

export default function FreelancerDetailsStep({
  value,
  onChange,
}: FreelancerDetailsStepProps) {
  const t = useTranslations('onboarding_flow')

  // Multi-select, capped at MAX_MULTI_SELECT (report BS-26).
  const atMax = value.service_categories.length >= MAX_MULTI_SELECT

  const toggleCategory = (category: OnboardingInterest) => {
    if (!value.service_categories.includes(category) && atMax) return
    const next = value.service_categories.includes(category)
      ? value.service_categories.filter((c) => c !== category)
      : [...value.service_categories, category]
    onChange({ ...value, service_categories: next })
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold">{t('freelancer_goal_title')}</h2>
        <div className="space-y-2">
          {FREELANCER_INTENT_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <SelectableCard
                key={option.value}
                selected={value.freelancer_intent === option.value}
                onSelect={() => onChange({ ...value, freelancer_intent: option.value })}
                title={t(option.labelKey)}
                icon={Icon ? <Icon className="size-5" /> : undefined}
              />
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t('freelancer_categories_title')}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t('freelancer_categories_hint')}</p>
        <div className="grid grid-cols-2 gap-2">
          {INTEREST_OPTIONS.filter((o) => o.value !== 'other').map((option) => {
            const Icon = option.icon
            return (
              <MultiSelectCard
                key={option.value}
                selected={value.service_categories.includes(option.value)}
                onToggle={() => toggleCategory(option.value)}
                title={t(option.labelKey)}
                icon={Icon ? <Icon className="size-4" /> : undefined}
                disabled={atMax}
              />
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t('freelancer_experience_title')}</h2>
        <div className="space-y-2">
          {SKILL_LEVEL_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <SelectableCard
                key={option.value}
                selected={value.skill_level === option.value}
                onSelect={() => onChange({ ...value, skill_level: option.value })}
                title={t(option.labelKey)}
                description={option.descKey ? t(option.descKey) : undefined}
                icon={Icon ? <Icon className="size-5" /> : undefined}
              />
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t('freelancer_availability_title')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {FREELANCER_AVAILABILITY_OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              selected={value.availability === option.value}
              onSelect={() => onChange({ ...value, availability: option.value })}
              title={t(option.labelKey)}
              className="min-h-[52px] p-3"
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="professional_headline">{t('freelancer_headline_label')}</Label>
          <Input
            id="professional_headline"
            value={value.professional_headline}
            onChange={(e) => onChange({ ...value, professional_headline: e.target.value })}
            placeholder={t('freelancer_headline_placeholder')}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('freelancer_links_title')}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="freelancer_linkedin">{t('freelancer_linkedin_label')}</Label>
          <Input
            id="freelancer_linkedin"
            type="url"
            value={value.linkedin}
            onChange={(e) => onChange({ ...value, linkedin: e.target.value })}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="freelancer_portfolio">{t('freelancer_portfolio_label')}</Label>
          <Input
            id="freelancer_portfolio"
            type="url"
            value={value.portfolio}
            onChange={(e) => onChange({ ...value, portfolio: e.target.value })}
            placeholder="https://"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="freelancer_github">{t('freelancer_github_label')}</Label>
          <Input
            id="freelancer_github"
            type="url"
            value={value.github}
            onChange={(e) => onChange({ ...value, github: e.target.value })}
            placeholder="https://github.com/..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="freelancer_website">{t('freelancer_website_label')}</Label>
          <Input
            id="freelancer_website"
            type="url"
            value={value.website}
            onChange={(e) => onChange({ ...value, website: e.target.value })}
            placeholder="https://"
          />
        </div>
      </section>
    </div>
  )
}
