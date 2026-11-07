'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookOpen, DollarSign, Film, Layers, Eye } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import CourseStatusBadge from '@/components/courses/CourseStatusBadge'
import Step1BasicInfo from '@/components/instructor/wizard/Step1BasicInfo'
import Step2Media from '@/components/instructor/wizard/Step2Media'
import Step3Curriculum from '@/components/instructor/wizard/Step3Curriculum'
import Step4Pricing from '@/components/instructor/wizard/Step4Pricing'
import type { SectionWithLessons } from '@/lib/courses/lesson-utils'
import type { Course } from '@/types'
import type { Step1FormValues } from '@/lib/instructor/course-wizard-schemas'

type ManageTab = 'details' | 'media' | 'curriculum' | 'pricing'

interface CourseManageEditorProps {
  locale: string
  course: Course
  sections: SectionWithLessons[]
  initialTab?: ManageTab
  platformCommissionPct?: number
}

const TAB_ORDER: ManageTab[] = ['details', 'media', 'curriculum', 'pricing']

function parseTab(value?: string): ManageTab {
  if (value && TAB_ORDER.includes(value as ManageTab)) {
    return value as ManageTab
  }
  return 'details'
}

export default function CourseManageEditor({
  locale,
  course,
  sections,
  initialTab,
  platformCommissionPct = 30,
}: CourseManageEditorProps) {
  const t = useTranslations('instructor')
  const isAr = locale === 'ar'
  const [tab, setTab] = useState<ManageTab>(parseTab(initialTab))
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    course.thumbnail_url ?? null
  )
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(
    course.preview_video_asset_id ?? null
  )

  const title = isAr ? course.title_ar : course.title

  const step1Defaults: Partial<Step1FormValues> = {
    title: course.title,
    title_ar: course.title_ar,
    description: course.description ?? '',
    description_ar: course.description_ar ?? '',
    category: course.category,
    level: course.level,
    language: (course.language as Step1FormValues['language']) ?? 'ar',
  }

  const tabs: { id: ManageTab; icon: typeof BookOpen; label: string }[] = [
    { id: 'details', icon: BookOpen, label: t('step_basic') },
    { id: 'media', icon: Film, label: t('step_media') },
    { id: 'curriculum', icon: Layers, label: t('step_curriculum') },
    { id: 'pricing', icon: DollarSign, label: t('step_pricing') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CourseStatusBadge status={course.status} />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">{t('manage_course_subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/courses/${course.id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 shrink-0')}
        >
          <Eye className="h-3.5 w-3.5" />
          {t('preview')}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              buttonVariants({
                variant: tab === item.id ? 'default' : 'outline',
                size: 'sm',
              }),
              'gap-1.5'
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <Step1BasicInfo
          locale={locale}
          courseId={course.id}
          defaultValues={step1Defaults}
          standalone
          onComplete={() => {}}
        />
      )}

      {tab === 'media' && (
        <Step2Media
          locale={locale}
          courseId={course.id}
          thumbnailUrl={thumbnailUrl}
          previewVideoUrl={previewVideoUrl}
          onThumbnailChange={setThumbnailUrl}
          onPreviewVideoChange={setPreviewVideoUrl}
          standalone
          onComplete={() => {}}
        />
      )}

      {tab === 'curriculum' && (
        <Step3Curriculum
          locale={locale}
          courseId={course.id}
          initialSections={sections}
          courseTitle={course.title_ar}
          courseLevel={course.level}
          standalone
        />
      )}

      {tab === 'pricing' && (
        <Step4Pricing
          locale={locale}
          courseId={course.id}
          defaultPrice={course.price ?? 0}
          standalone
          platformCommissionPct={platformCommissionPct}
        />
      )}

      <p className="text-xs text-muted-foreground text-center pt-4">
        <Link href={`/${locale}/instructor/courses`} className="hover:underline">
          {t('back_to_courses')}
        </Link>
      </p>
    </div>
  )
}
