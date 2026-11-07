import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Award, ExternalLink } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/profile'
import { getStudentCertificates } from '@/lib/certificates/get-certificates'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export default async function CertificatesDashboardPage() {
  const locale = await getLocale()
  const t = await getTranslations('certificates')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const certificates = await getStudentCertificates(session.authUser.id)
  const isAr = locale === 'ar'

  return (
    <main>
            <h1 className="text-2xl font-bold mb-1">{t('my_certificates')}</h1>
            <p className="text-muted-foreground text-sm mb-6">{t('my_certificates_desc')}</p>

            {certificates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Award className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>{t('no_certificates')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {certificates.map((cert) => {
                  const title = isAr ? cert.course_title_ar : cert.course_title
                  return (
                    <Card key={cert.id} className="overflow-hidden">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold line-clamp-2">{title}</p>
                            <p className="text-xs text-muted-foreground mt-1 num-en">
                              {formatDate(cert.issued_at, locale)}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground mt-1 num-en">
                              {cert.verification_code}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/${locale}/certificate/${cert.verification_code}`}
                          className={buttonVariants({ size: 'sm', className: 'w-full gap-2' })}
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t('view_certificate')}
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </main>
  )
}
