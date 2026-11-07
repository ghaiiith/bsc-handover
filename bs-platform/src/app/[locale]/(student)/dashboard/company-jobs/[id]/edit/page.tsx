import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import AdminJobForm from '@/components/admin/AdminJobForm'
import { requireCompanyRep } from '@/lib/company/require-company'
import { getCompanyJobForEdit, saveCompanyJob } from '@/lib/jobs/company-job-actions'
import type { Job } from '@/types'

interface EditCompanyJobPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCompanyJobPage({ params }: EditCompanyJobPageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  const userId = await requireCompanyRep(locale)
  const job = await getCompanyJobForEdit(id, userId)

  if (!job) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('edit_job')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('company_jobs_subtitle')}</p>
      </div>
      <AdminJobForm
        locale={locale}
        job={job as Job}
        onSave={saveCompanyJob}
        successRedirect={`/${locale}/dashboard/company-jobs`}
      />
    </div>
  )
}
