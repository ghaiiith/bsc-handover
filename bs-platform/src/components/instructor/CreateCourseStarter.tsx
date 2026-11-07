'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Step1BasicInfo from '@/components/instructor/wizard/Step1BasicInfo'

interface CreateCourseStarterProps {
  locale: string
}

export default function CreateCourseStarter({ locale }: CreateCourseStarterProps) {
  const router = useRouter()
  const t = useTranslations('instructor')

  return (
    <Step1BasicInfo
      locale={locale}
      courseId={null}
      submitLabel={t('create_continue')}
      onComplete={(courseId) => {
        router.push(`/${locale}/instructor/courses/${courseId}/studio`)
      }}
    />
  )
}
