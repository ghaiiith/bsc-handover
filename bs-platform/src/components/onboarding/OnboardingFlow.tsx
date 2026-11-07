'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import OnboardingStepShell from '@/components/onboarding/OnboardingStepShell'
import AccountTypeStep from '@/components/onboarding/AccountTypeStep'
import StudentDetailsStep, {
  type StudentDetailsValue,
} from '@/components/onboarding/StudentDetailsStep'
import InstructorDetailsStep, {
  type InstructorDetailsValue,
} from '@/components/onboarding/InstructorDetailsStep'
import CompanyDetailsStep, {
  type CompanyDetailsValue,
} from '@/components/onboarding/CompanyDetailsStep'
import FreelancerDetailsStep, {
  type FreelancerDetailsValue,
} from '@/components/onboarding/FreelancerDetailsStep'
import DiscoverySourceStep from '@/components/onboarding/DiscoverySourceStep'
import OnboardingReviewStep from '@/components/onboarding/OnboardingReviewStep'
import { ONBOARDING_TOTAL_STEPS } from '@/components/onboarding/onboarding-options'
import { completeOnboarding } from '@/lib/onboarding/actions'
import type { DiscoverySource, OnboardingAccountType } from '@/types/onboarding'

const initialStudent: StudentDetailsValue = {
  primary_goal: null,
  skill_level: null,
  interests: [],
}

const initialInstructor: InstructorDetailsValue = {
  instructor_intent: null,
  interests: [],
  instructor_experience: null,
  instructor_upload_plan: null,
  linkedin: '',
  portfolio: '',
  youtube: '',
  website: '',
}

const initialCompany: CompanyDetailsValue = {
  company_intent: null,
  company_name: '',
  company_industry: '',
  company_size: null,
  company_website: '',
  company_linkedin: '',
}

const initialFreelancer: FreelancerDetailsValue = {
  freelancer_intent: null,
  service_categories: [],
  skill_level: null,
  availability: null,
  professional_headline: '',
  linkedin: '',
  portfolio: '',
  github: '',
  website: '',
}

const DRAFT_STORAGE_KEY = 'bs-onboarding-draft-v1'

interface OnboardingDraft {
  step: number
  accountType: OnboardingAccountType | null
  student: StudentDetailsValue
  instructor: InstructorDetailsValue
  company: CompanyDetailsValue
  freelancer: FreelancerDetailsValue
  discoverySource: DiscoverySource | null
  discoveryOther: string
}

export default function OnboardingFlow() {
  const locale = useLocale()
  const t = useTranslations('onboarding_flow')
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)

  const [accountType, setAccountType] = useState<OnboardingAccountType | null>(null)
  const [student, setStudent] = useState<StudentDetailsValue>(initialStudent)
  const [instructor, setInstructor] = useState<InstructorDetailsValue>(initialInstructor)
  const [company, setCompany] = useState<CompanyDetailsValue>(initialCompany)
  const [freelancer, setFreelancer] = useState<FreelancerDetailsValue>(initialFreelancer)
  const [discoverySource, setDiscoverySource] = useState<DiscoverySource | null>(null)
  const [discoveryOther, setDiscoveryOther] = useState('')

  // Restore an in-progress draft so a refresh doesn't reset the wizard.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as Partial<OnboardingDraft>
        if (draft.accountType) setAccountType(draft.accountType)
        if (draft.student) setStudent({ ...initialStudent, ...draft.student })
        if (draft.instructor) setInstructor({ ...initialInstructor, ...draft.instructor })
        if (draft.company) setCompany({ ...initialCompany, ...draft.company })
        if (draft.freelancer) setFreelancer({ ...initialFreelancer, ...draft.freelancer })
        if (draft.discoverySource) setDiscoverySource(draft.discoverySource)
        if (typeof draft.discoveryOther === 'string') setDiscoveryOther(draft.discoveryOther)
        if (
          typeof draft.step === 'number' &&
          draft.step >= 1 &&
          draft.step <= ONBOARDING_TOTAL_STEPS
        ) {
          setStep(draft.step)
        }
      }
    } catch {
      // corrupt draft — start fresh
    }
    setDraftLoaded(true)
  }, [])

  useEffect(() => {
    if (!draftLoaded) return
    try {
      const draft: OnboardingDraft = {
        step,
        accountType,
        student,
        instructor,
        company,
        freelancer,
        discoverySource,
        discoveryOther,
      }
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // storage unavailable (private mode) — draft persistence is best-effort
    }
  }, [
    draftLoaded,
    step,
    accountType,
    student,
    instructor,
    company,
    freelancer,
    discoverySource,
    discoveryOther,
  ])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign(`/${locale}/login`)
  }

  const canContinueStep1 = accountType !== null

  const canContinueStep2 =
    accountType === 'student'
      ? Boolean(student.primary_goal && student.skill_level && student.interests.length > 0)
      : accountType === 'instructor'
        ? Boolean(
            instructor.instructor_intent &&
              instructor.interests.length > 0 &&
              instructor.instructor_experience &&
              instructor.instructor_upload_plan
          )
        : accountType === 'company'
          ? Boolean(
              company.company_intent &&
                company.company_name.trim().length >= 2 &&
                company.company_industry.trim().length >= 2 &&
                company.company_size
            )
          : accountType === 'freelancer'
            ? Boolean(
                freelancer.freelancer_intent &&
                  freelancer.service_categories.length > 0 &&
                  freelancer.skill_level &&
                  freelancer.availability &&
                  freelancer.professional_headline.trim().length >= 2
              )
            : false

  const canContinueStep3 =
    discoverySource !== null &&
    (discoverySource !== 'other' || discoveryOther.trim().length >= 2)

  const handleContinue = () => {
    if (step < ONBOARDING_TOTAL_STEPS) {
      setStep((s) => s + 1)
      return
    }
    void handleSubmit()
  }

  const handleSubmit = async () => {
    if (!accountType || !discoverySource) return
    setSubmitting(true)

    const payload = {
      account_type: accountType,
      discovery_source: discoverySource,
      discovery_source_other: discoverySource === 'other' ? discoveryOther : undefined,
      student:
        accountType === 'student'
          ? {
              primary_goal: student.primary_goal!,
              skill_level: student.skill_level!,
              interests: student.interests,
            }
          : undefined,
      instructor:
        accountType === 'instructor'
          ? {
              instructor_intent: instructor.instructor_intent!,
              interests: instructor.interests,
              instructor_experience: instructor.instructor_experience!,
              instructor_upload_plan: instructor.instructor_upload_plan!,
              linkedin: instructor.linkedin || undefined,
              portfolio: instructor.portfolio || undefined,
              youtube: instructor.youtube || undefined,
              website: instructor.website || undefined,
            }
          : undefined,
      company:
        accountType === 'company'
          ? {
              company_intent: company.company_intent!,
              company_name: company.company_name.trim(),
              company_industry: company.company_industry.trim(),
              company_size: company.company_size!,
              company_website: company.company_website || undefined,
              company_linkedin: company.company_linkedin || undefined,
            }
          : undefined,
      freelancer:
        accountType === 'freelancer'
          ? {
              freelancer_intent: freelancer.freelancer_intent!,
              service_categories: freelancer.service_categories,
              skill_level: freelancer.skill_level!,
              availability: freelancer.availability!,
              professional_headline: freelancer.professional_headline.trim(),
              linkedin: freelancer.linkedin || undefined,
              portfolio: freelancer.portfolio || undefined,
              github: freelancer.github || undefined,
              website: freelancer.website || undefined,
            }
          : undefined,
    }

    const result = await completeOnboarding(locale, payload)
    setSubmitting(false)

    if (!result.ok) {
      toast.error(t('submit_error'))
      return
    }

    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      // ignore
    }
    window.location.replace(result.redirectTo)
  }

  const stepTitle = () => {
    switch (step) {
      case 1:
        return t('step1_title')
      case 2:
        return accountType === 'student'
          ? t('step2_student_title')
          : accountType === 'instructor'
            ? t('step2_instructor_title')
            : accountType === 'freelancer'
              ? t('step2_freelancer_title')
              : t('step2_company_title')
      case 3:
        return t('step3_title')
      case 4:
        return t('step4_title')
      default:
        return t('step1_title')
    }
  }

  const stepSubtitle = () => {
    if (step === 1) return t('step1_subtitle')
    if (step === 3) return t('step3_subtitle')
    if (step === 4) return t('step4_subtitle')
    return undefined
  }

  const canContinue =
    step === 1
      ? canContinueStep1
      : step === 2
        ? canContinueStep2
        : step === 3
          ? canContinueStep3
          : true

  return (
    <OnboardingStepShell
      step={step}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={stepTitle()}
      subtitle={stepSubtitle()}
      headerAction={
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          {t('sign_out')}
        </button>
      }
      footer={
        <div className="flex gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
            >
              {t('back')}
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-11 flex-1 bg-[#E57D17] hover:bg-[#CC6F14]"
            disabled={!canContinue || submitting}
            onClick={handleContinue}
          >
            {submitting
              ? t('submitting')
              : step === ONBOARDING_TOTAL_STEPS
                ? t('complete_setup')
                : t('continue')}
          </Button>
        </div>
      }
    >
      {step === 1 ? (
        <AccountTypeStep value={accountType} onChange={setAccountType} />
      ) : null}
      {step === 2 && accountType === 'student' ? (
        <StudentDetailsStep value={student} onChange={setStudent} />
      ) : null}
      {step === 2 && accountType === 'instructor' ? (
        <InstructorDetailsStep value={instructor} onChange={setInstructor} />
      ) : null}
      {step === 2 && accountType === 'company' ? (
        <CompanyDetailsStep value={company} onChange={setCompany} />
      ) : null}
      {step === 2 && accountType === 'freelancer' ? (
        <FreelancerDetailsStep value={freelancer} onChange={setFreelancer} />
      ) : null}
      {step === 3 ? (
        <DiscoverySourceStep
          value={discoverySource}
          otherText={discoveryOther}
          onChangeSource={setDiscoverySource}
          onChangeOther={setDiscoveryOther}
        />
      ) : null}
      {step === 4 && accountType ? (
        <OnboardingReviewStep
          accountType={accountType}
          student={student}
          instructor={instructor}
          company={company}
          freelancer={freelancer}
          discoverySource={discoverySource}
          discoveryOther={discoveryOther}
        />
      ) : null}
    </OnboardingStepShell>
  )
}
