'use client'

import { useTranslations } from 'next-intl'
import type { DiscoverySource, OnboardingAccountType, CompanySize } from '@/types/onboarding'
import type { StudentDetailsValue } from '@/components/onboarding/StudentDetailsStep'
import type { InstructorDetailsValue } from '@/components/onboarding/InstructorDetailsStep'
import type { CompanyDetailsValue } from '@/components/onboarding/CompanyDetailsStep'
import type { FreelancerDetailsValue } from '@/components/onboarding/FreelancerDetailsStep'

function companySizeLabelKey(size: CompanySize): string {
  if (size === '200+') return 'size_200_plus'
  return `size_${size.replace(/-/g, '_')}`
}

interface OnboardingReviewStepProps {
  accountType: OnboardingAccountType
  student: StudentDetailsValue
  instructor: InstructorDetailsValue
  company: CompanyDetailsValue
  freelancer: FreelancerDetailsValue
  discoverySource: DiscoverySource | null
  discoveryOther: string
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function OnboardingReviewStep({
  accountType,
  student,
  instructor,
  company,
  freelancer,
  discoverySource,
  discoveryOther,
}: OnboardingReviewStepProps) {
  const t = useTranslations('onboarding_flow')

  const discoveryLabel = discoverySource
    ? discoverySource === 'other'
      ? discoveryOther
      : t(`discovery_${discoverySource}`)
    : ''

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <ReviewRow label={t('review_account_type')} value={t(`account_${accountType}`)} />
      {accountType === 'student' && student.primary_goal ? (
        <>
          <ReviewRow label={t('review_goal')} value={t(`goal_${student.primary_goal}`)} />
          <ReviewRow
            label={t('review_interests')}
            value={student.interests.map((i) => t(`interest_${i}`)).join(', ')}
          />
          <ReviewRow
            label={t('review_skill_level')}
            value={student.skill_level ? t(`level_${student.skill_level}`) : ''}
          />
        </>
      ) : null}
      {accountType === 'instructor' && instructor.instructor_intent ? (
        <>
          <ReviewRow
            label={t('review_instructor_goal')}
            value={t(`instructor_${instructor.instructor_intent}`)}
          />
          <ReviewRow
            label={t('review_content_areas')}
            value={instructor.interests.map((i) => t(`interest_${i}`)).join(', ')}
          />
        </>
      ) : null}
      {accountType === 'company' && company.company_name ? (
        <>
          <ReviewRow label={t('review_company')} value={company.company_name} />
          <ReviewRow label={t('review_industry')} value={company.company_industry} />
          <ReviewRow
            label={t('review_company_size')}
            value={company.company_size ? t(companySizeLabelKey(company.company_size)) : ''}
          />
        </>
      ) : null}
      {accountType === 'freelancer' && freelancer.freelancer_intent ? (
        <>
          <ReviewRow
            label={t('review_freelancer_goal')}
            value={t(`freelancer_${freelancer.freelancer_intent}`)}
          />
          <ReviewRow
            label={t('review_service_categories')}
            value={freelancer.service_categories.map((i) => t(`interest_${i}`)).join(', ')}
          />
          <ReviewRow
            label={t('review_skill_level')}
            value={freelancer.skill_level ? t(`level_${freelancer.skill_level}`) : ''}
          />
          <ReviewRow
            label={t('review_availability')}
            value={freelancer.availability ? t(`freelancer_avail_${freelancer.availability}`) : ''}
          />
          <ReviewRow label={t('review_headline')} value={freelancer.professional_headline} />
        </>
      ) : null}
      <ReviewRow label={t('review_discovery')} value={discoveryLabel} />
    </div>
  )
}
