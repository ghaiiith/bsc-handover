import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import BecomeInstructorForm from '@/components/student/BecomeInstructorForm'
import { getSessionProfile } from '@/lib/auth/profile'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'

export default async function BecomeInstructorPage() {
  const locale = await getLocale()
  const t = await getTranslations('become_instructor')
  const session = await getSessionProfile()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  const { authUser, profile } = session

  if (profile?.role === 'instructor' || profile?.role === 'admin') {
    redirect(`/${locale}/instructor`)
  }

  const existingRequest = await getMyInstructorRequest(authUser.id)

  return (
    <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>

        <div className="mb-8 rounded-xl border bg-background p-6 space-y-3">
          <h2 className="font-semibold">{t('how_it_works')}</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t('step_1')}</li>
            <li>{t('step_2')}</li>
            <li>{t('step_3')}</li>
            <li>{t('step_4')}</li>
          </ol>
        </div>

        <BecomeInstructorForm locale={locale} existingRequest={existingRequest} />
    </div>
  )
}
