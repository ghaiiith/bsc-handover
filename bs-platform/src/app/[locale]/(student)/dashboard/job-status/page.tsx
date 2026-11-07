import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/profile'
import JobStatusAnswerButtons from '@/components/jobs/JobStatusAnswerButtons'

// Report BS-64: the page the monthly "did you find a job?" ping links to.
export default async function JobStatusPage() {
  const locale = await getLocale()
  const t = await getTranslations('jobStatus')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <JobStatusAnswerButtons />
    </div>
  )
}
