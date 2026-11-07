'use client'

import { useTranslations } from 'next-intl'
import SelectableCard, { MultiSelectCard } from '@/components/onboarding/SelectableCard'
import {
  INTEREST_OPTIONS,
  SKILL_LEVEL_OPTIONS,
  STUDENT_GOAL_OPTIONS,
} from '@/components/onboarding/onboarding-options'
import { MAX_MULTI_SELECT } from '@/lib/onboarding/schema'
import type {
  OnboardingInterest,
  OnboardingSkillLevel,
  StudentPrimaryGoal,
} from '@/types/onboarding'

export interface StudentDetailsValue {
  primary_goal: StudentPrimaryGoal | null
  skill_level: OnboardingSkillLevel | null
  interests: OnboardingInterest[]
}

interface StudentDetailsStepProps {
  value: StudentDetailsValue
  onChange: (value: StudentDetailsValue) => void
}

export default function StudentDetailsStep({ value, onChange }: StudentDetailsStepProps) {
  const t = useTranslations('onboarding_flow')

  // Multi-select, capped at MAX_MULTI_SELECT (report BS-26).
  const atMax = value.interests.length >= MAX_MULTI_SELECT

  const toggleInterest = (interest: OnboardingInterest) => {
    const exists = value.interests.includes(interest)
    if (!exists && atMax) return
    onChange({
      ...value,
      interests: exists
        ? value.interests.filter((i) => i !== interest)
        : [...value.interests, interest],
    })
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t('primary_goal_title')}</h2>
        <div className="space-y-2">
          {STUDENT_GOAL_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <SelectableCard
                key={option.value}
                selected={value.primary_goal === option.value}
                onSelect={() => onChange({ ...value, primary_goal: option.value })}
                title={t(option.labelKey)}
                icon={Icon ? <Icon className="size-5" /> : undefined}
              />
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('interests_title')}</h2>
          <span className="shrink-0 text-xs text-muted-foreground num-en">
            {value.interests.length}/{MAX_MULTI_SELECT}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INTEREST_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <MultiSelectCard
                key={option.value}
                selected={value.interests.includes(option.value)}
                onToggle={() => toggleInterest(option.value)}
                title={t(option.labelKey)}
                icon={Icon ? <Icon className="size-4" /> : undefined}
                disabled={atMax}
              />
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t('skill_level_title')}</h2>
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
    </div>
  )
}
