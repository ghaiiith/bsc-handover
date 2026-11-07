'use client'

import { useTranslations } from 'next-intl'
import SelectableCard, { MultiSelectCard } from '@/components/onboarding/SelectableCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  INSTRUCTOR_EXPERIENCE_OPTIONS,
  INSTRUCTOR_INTENT_OPTIONS,
  INSTRUCTOR_UPLOAD_PLAN_OPTIONS,
  INTEREST_OPTIONS,
} from '@/components/onboarding/onboarding-options'
import { MAX_MULTI_SELECT } from '@/lib/onboarding/schema'
import type {
  InstructorExperience,
  InstructorIntent,
  InstructorUploadPlan,
  OnboardingInterest,
} from '@/types/onboarding'

export interface InstructorDetailsValue {
  instructor_intent: InstructorIntent | null
  interests: OnboardingInterest[]
  instructor_experience: InstructorExperience | null
  instructor_upload_plan: InstructorUploadPlan | null
  linkedin: string
  portfolio: string
  youtube: string
  website: string
}

interface InstructorDetailsStepProps {
  value: InstructorDetailsValue
  onChange: (value: InstructorDetailsValue) => void
}

export default function InstructorDetailsStep({ value, onChange }: InstructorDetailsStepProps) {
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
        <h2 className="mb-3 text-sm font-semibold">{t('instructor_goal_title')}</h2>
        <div className="space-y-2">
          {INSTRUCTOR_INTENT_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <SelectableCard
                key={option.value}
                selected={value.instructor_intent === option.value}
                onSelect={() => onChange({ ...value, instructor_intent: option.value })}
                title={t(option.labelKey)}
                icon={Icon ? <Icon className="size-5" /> : undefined}
              />
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t('content_areas_title')}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INTEREST_OPTIONS.filter((o) =>
            ['programming', 'design', 'marketing', 'business', 'ai', 'english', 'professional_skills', 'other'].includes(
              o.value
            )
          ).map((option) => {
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
        <h2 className="mb-3 text-sm font-semibold">{t('experience_title')}</h2>
        <div className="space-y-2">
          {INSTRUCTOR_EXPERIENCE_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <SelectableCard
                key={option.value}
                selected={value.instructor_experience === option.value}
                onSelect={() => onChange({ ...value, instructor_experience: option.value })}
                title={t(option.labelKey)}
                icon={Icon ? <Icon className="size-5" /> : undefined}
              />
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t('upload_plan_title')}</h2>
        <div className="space-y-2">
          {INSTRUCTOR_UPLOAD_PLAN_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <SelectableCard
                key={option.value}
                selected={value.instructor_upload_plan === option.value}
                onSelect={() => onChange({ ...value, instructor_upload_plan: option.value })}
                title={t(option.labelKey)}
                icon={Icon ? <Icon className="size-5" /> : undefined}
              />
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('professional_links_title')}</h2>
        <p className="text-xs text-muted-foreground">{t('professional_links_optional')}</p>
        {(['linkedin', 'portfolio', 'youtube', 'website'] as const).map((field) => (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={field}>{t(`link_${field}`)}</Label>
            <Input
              id={field}
              type="url"
              inputMode="url"
              placeholder="https://"
              value={value[field]}
              onChange={(e) => onChange({ ...value, [field]: e.target.value })}
            />
          </div>
        ))}
      </section>
    </div>
  )
}
