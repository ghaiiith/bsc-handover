import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import JobCandidatesClient from '@/components/admin/JobCandidatesClient'
import { countEligibleCandidates } from '@/lib/admin/candidates/rank-job-candidates'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getJobForEdit } from '@/lib/jobs/get-admin-jobs'

interface JobCandidatesPageProps {
  params: Promise<{ id: string }>
}

export default async function JobCandidatesPage({ params }: JobCandidatesPageProps) {
  const { id } = await params
  const locale = await getLocale()

  await requireAdminAccess(locale)

  const job = await getJobForEdit(id)
  if (!job) {
    notFound()
  }

  const eligibleCount = await countEligibleCandidates()

  return (
    <JobCandidatesClient locale={locale} job={job} eligibleCount={eligibleCount} />
  )
}
