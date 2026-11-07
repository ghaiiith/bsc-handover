import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Users } from 'lucide-react'
import AdminJobForm from '@/components/admin/AdminJobForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getJobForEdit } from '@/lib/jobs/get-admin-jobs'

interface AdminEditJobPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditJobPage({ params }: AdminEditJobPageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  const tCandidates = await getTranslations('candidates')

  await requireAdminAccess(locale)

  const job = await getJobForEdit(id)
  if (!job) {
    notFound()
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('edit_job')}</h1>
        <Link
          href={`/${locale}/admin/jobs/${id}/candidates`}
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 text-teal-600 border-teal-600/30')}
        >
          <Users className="h-4 w-4" />
          {tCandidates('find_button')}
        </Link>
      </div>
      <AdminJobForm locale={locale} job={job} />
    </div>
  )
}
