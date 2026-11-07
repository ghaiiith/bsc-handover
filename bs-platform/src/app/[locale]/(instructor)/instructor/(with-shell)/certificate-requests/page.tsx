import { getLocale, getTranslations } from 'next-intl/server'
import PageHeader from '@/components/dashboard/ux/PageHeader'
import InstructorCertificateRequestsClient from '@/components/instructor/InstructorCertificateRequestsClient'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getInstructorCertificateRequests } from '@/lib/instructor/get-certificate-requests'

export default async function InstructorCertificateRequestsPage() {
  const locale = await getLocale()
  const t = await getTranslations('instructor.certificate_requests')
  const { userId } = await requireInstructorAccess(locale)
  const requests = await getInstructorCertificateRequests(userId)

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <InstructorCertificateRequestsClient locale={locale} requests={requests} />
    </>
  )
}
