'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Award, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { CertificateWithCourse } from '@/types/certificate'

interface ProfileCertificatesSectionProps {
  locale: string
  certificates: CertificateWithCourse[]
}

export default function ProfileCertificatesSection({
  locale,
  certificates,
}: ProfileCertificatesSectionProps) {
  const t = useTranslations('certificates')
  const isAr = locale === 'ar'

  if (certificates.length === 0) return null

  return (
    <Card id="certificates" className="edu-card shadow-none scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          {t('my_certificates')}
        </CardTitle>
        <Link
          href={`/${locale}/dashboard/certificates`}
          className="text-xs text-primary hover:underline"
        >
          {t('view_all')}
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {certificates.slice(0, 5).map((cert) => {
          const title = isAr ? cert.course_title_ar : cert.course_title
          return (
            <div
              key={cert.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-muted">
                {cert.course_thumbnail_url ? (
                  <Image
                    src={cert.course_thumbnail_url}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Award className="h-5 w-5 text-primary/60" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{title}</p>
                <p className="text-xs text-muted-foreground num-en">
                  {formatDate(cert.issued_at, locale)}
                </p>
              </div>
              <Link
                href={`/${locale}/certificate/${cert.verification_code}`}
                className={buttonVariants({ size: 'sm', variant: 'outline', className: 'gap-1 shrink-0' })}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('view')}
              </Link>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
