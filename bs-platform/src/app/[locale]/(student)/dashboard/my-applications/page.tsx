import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Briefcase, ExternalLink, MapPin } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/profile'
import { getMyApplications } from '@/lib/jobs/applications'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const STATUS_TONE: Record<string, string> = {
  submitted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  reviewed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  shortlisted: 'bg-green-500/10 text-green-600 dark:text-green-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  accepted: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

export default async function MyApplicationsPage() {
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const applications = await getMyApplications(session.authUser.id)
  const isAr = locale === 'ar'

  return (
    <main>
      <h1 className="text-2xl font-bold mb-1">{t('my_applications')}</h1>
      <p className="text-muted-foreground text-sm mb-6">{t('my_applications_desc')}</p>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{t('no_applications')}</p>
            <Link
              href={`/${locale}/jobs`}
              className={buttonVariants({ size: 'sm', variant: 'outline', className: 'mt-4' })}
            >
              {t('browse_jobs')}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const title = (isAr ? app.job?.title_ar : app.job?.title) || app.job?.title
            const knownStatus = ['submitted', 'reviewed', 'shortlisted', 'rejected', 'accepted'].includes(
              app.status
            )
            return (
              <Card key={app.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{title ?? '—'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {app.job?.company_name ? <span>{app.job.company_name}</span> : null}
                      {app.job?.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {app.job.city}
                        </span>
                      ) : null}
                      <span className="num-en">{formatDate(app.applied_at, locale)}</span>
                    </div>
                  </div>
                  <Badge className={STATUS_TONE[app.status] ?? STATUS_TONE.submitted}>
                    {knownStatus ? t(`application_status_${app.status}`) : app.status}
                  </Badge>
                  {app.job?.id ? (
                    <Link
                      href={`/${locale}/jobs/${app.job.id}`}
                      className={buttonVariants({ size: 'sm', variant: 'ghost', className: 'gap-1' })}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
