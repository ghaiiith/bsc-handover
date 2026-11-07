'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import WizardProgress from '@/components/instructor/wizard/WizardProgress'
import Step1BasicInfo from '@/components/instructor/wizard/Step1BasicInfo'
import Step2Media from '@/components/instructor/wizard/Step2Media'
import Step3Curriculum from '@/components/instructor/wizard/Step3Curriculum'
import Step4Pricing from '@/components/instructor/wizard/Step4Pricing'
import type { SectionWithLessons } from '@/lib/courses/lesson-utils'
import type { Course } from '@/types'
import type { Step1FormValues } from '@/lib/instructor/course-wizard-schemas'

interface CourseWizardProps {
  locale: string
  mode: 'create' | 'edit'
  initialCourse?: Course
  initialSections?: SectionWithLessons[]
  initialStep?: number
  platformCommissionPct?: number
}

export default function CourseWizard({
  locale,
  mode,
  initialCourse,
  initialSections = [],
  initialStep = 1,
  platformCommissionPct = 30,
}: CourseWizardProps) {
  const t = useTranslations('instructor')
  const [step, setStep] = useState(
    initialStep >= 1 && initialStep <= 4 ? initialStep : 1
  )
  const [courseId, setCourseId] = useState<string | null>(initialCourse?.id ?? null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    initialCourse?.thumbnail_url ?? null
  )
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(
    initialCourse?.preview_video_asset_id ?? null
  )
  const [thumbnailPrompt, setThumbnailPrompt] = useState<string | null>(null)
  const [courseMeta, setCourseMeta] = useState({
    title_ar: initialCourse?.title_ar ?? '',
    level: (initialCourse?.level ?? 'beginner') as Step1FormValues['level'],
  })

  const stepLabels = [
    t('step_basic'),
    t('step_media'),
    t('step_curriculum'),
    t('step_pricing'),
  ]

  const step1Defaults: Partial<Step1FormValues> | undefined = initialCourse
    ? {
        title: initialCourse.title,
        title_ar: initialCourse.title_ar,
        description: initialCourse.description ?? '',
        description_ar: initialCourse.description_ar ?? '',
        category: initialCourse.category,
        level: initialCourse.level,
        language: (initialCourse.language as Step1FormValues['language']) ?? 'ar',
      }
    : undefined

  return (
    <div>
      <WizardProgress currentStep={step} labels={stepLabels} />

      {step === 1 && (
        <Step1BasicInfo
          locale={locale}
          courseId={courseId}
          defaultValues={step1Defaults}
          onComplete={(id, values) => {
            setCourseId(id)
            if (values) {
              setCourseMeta({ title_ar: values.title_ar, level: values.level })
            }
            setStep(2)
          }}
          onAiApplied={({ thumbnailPrompt: prompt }) => {
            setThumbnailPrompt(prompt)
          }}
        />
      )}

      {step === 2 && courseId && (
        <Step2Media
          locale={locale}
          courseId={courseId}
          thumbnailUrl={thumbnailUrl}
          previewVideoUrl={previewVideoUrl}
          thumbnailPrompt={thumbnailPrompt}
          onThumbnailChange={setThumbnailUrl}
          onPreviewVideoChange={setPreviewVideoUrl}
          onComplete={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && courseId && (
        <Step3Curriculum
          locale={locale}
          courseId={courseId}
          initialSections={initialSections}
          courseTitle={courseMeta.title_ar}
          courseLevel={courseMeta.level}
          onComplete={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && courseId && (
        <Step4Pricing
          locale={locale}
          courseId={courseId}
          defaultPrice={initialCourse?.price ?? 0}
          onBack={() => setStep(3)}
          platformCommissionPct={platformCommissionPct}
        />
      )}

      {mode === 'edit' && courseId && step === 1 && (
        <p className="text-xs text-muted-foreground mt-4">{t('edit_mode_hint')}</p>
      )}
    </div>
  )
}
