import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Shield } from 'lucide-react'
import CertificateTemplate from '@/components/certificates/CertificateTemplate'
import CertificateActions from '@/components/certificates/CertificateActions'
import ShareButtons from '@/components/shared/ShareButtons'
import { getCertificateByCode } from '@/lib/certificates/get-certificates'
import { getAppUrl } from '@/lib/seo/metadata'
import { formatDate } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

interface CertificatePageProps {
  params: Promise<{ code: string }>
}

export default async function CertificateVerifyPage({ params }: CertificatePageProps) {
  const { code } = await params
  const locale = await getLocale()
  const t = await getTranslations('certificates')
  const isAr = locale === 'ar'

  const certificate = await getCertificateByCode(code)
  if (!certificate) notFound()

  const studentName = isAr
    ? certificate.student_name_ar ?? certificate.student_name
    : certificate.student_name
  const courseTitle = isAr ? certificate.course_title_ar : certificate.course_title
  const instructorName = isAr
    ? certificate.instructor_name_ar ?? certificate.instructor_name
    : certificate.instructor_name

  const verifyUrl = `${getAppUrl()}/${locale}/certificate/${certificate.verification_code}`
  const fileName = `business-skills-certificate-${certificate.verification_code}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-background to-background flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-emerald-600" />
          {t('verified_badge')}
        </div>

        <CertificateTemplate
          variant="full"
          studentName={studentName}
          courseTitle={courseTitle}
          instructorName={instructorName}
          issuedDate={formatDate(certificate.issued_at, locale)}
          verificationCode={certificate.verification_code}
          verifyUrl={verifyUrl}
          labels={{
            certificateOfCompletion: t('certificate_of_completion'),
            presentedTo: t('presented_to'),
            forCompleting: t('for_completing'),
            instructor: t('instructor'),
            issuedOn: t('issued_on'),
            verificationCode: t('verification_code'),
            authenticCertificate: t('authentic_certificate'),
          }}
        />

        <CertificateActions verifyUrl={verifyUrl} fileName={fileName} />

        <div className="mt-6 flex justify-center">
          <ShareButtons url={verifyUrl} title={`${studentName} — ${courseTitle}`} />
        </div>

        <div className="mt-8 text-center">
          <Link href={`/${locale}`} className={buttonVariants({ variant: 'outline' })}>
            {t('back_to_home')}
          </Link>
        </div>
      </div>
    </div>
  )
}
