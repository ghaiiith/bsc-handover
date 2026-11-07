import { getLocale, getTranslations } from 'next-intl/server'
import AdminJobForm from '@/components/admin/AdminJobForm'
import { requireCompanyRep } from '@/lib/company/require-company'
import { saveCompanyJob } from '@/lib/jobs/company-job-actions'

export default async function NewCompanyJobPage() {
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  await requireCompanyRep(locale)

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('create_job')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('company_jobs_subtitle')}</p>
      </div>
      <AdminJobForm
        locale={locale}
        onSave={saveCompanyJob}
        successRedirect={`/${locale}/dashboard/company-jobs`}
      />
    </div>
  )
}
