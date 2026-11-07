import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import BecomeCompanyForm from '@/components/student/BecomeCompanyForm'
import { getSessionProfile } from '@/lib/auth/profile'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'

export default async function CompanyAffiliationPage() {
  const locale = await getLocale()
  const t = await getTranslations('company_affiliation')
  const session = await getSessionProfile()

  if (!session) redirect(`/${locale}/login`)

  if (session.profile?.role === 'company' || session.profile?.role === 'admin') {
    redirect(`/${locale}/dashboard/company-jobs`)
  }

  const existingRequest = await getMyCompanyAffiliationRequest(session.authUser.id)

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="mb-8 space-y-3 rounded-xl border bg-background p-6">
        <h2 className="font-semibold">{t('benefits_title')}</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>{t('benefit_jobs')}</li>
          <li>{t('benefit_portfolios')}</li>
          <li>{t('benefit_community')}</li>
        </ul>
      </div>

      <BecomeCompanyForm locale={locale} existingRequest={existingRequest} />
    </div>
  )
}
