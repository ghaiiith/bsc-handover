import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Bookmark, MapPin } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/profile'
import { getSavedJobs } from '@/lib/jobs/saved-jobs'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function SavedJobsPage() {
  const locale = await getLocale()
  const t = await getTranslations('jobs')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const saved = await getSavedJobs(session.authUser.id)
  const isAr = locale === 'ar'

  return (
    <main>
      <h1 className="text-2xl font-bold mb-1">{t('saved_jobs')}</h1>
      <p className="text-muted-foreground text-sm mb-6">{t('saved_jobs_desc')}</p>

      {saved.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{t('no_saved_jobs')}</p>
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
          {saved.map((item) => {
            const title = (isAr ? item.job?.title_ar : item.job?.title) || item.job?.title
            if (!item.job) return null
            return (
              <Link key={item.id} href={`/${locale}/jobs/${item.job.id}`} className="block">
                <Card className="transition hover:border-primary/40">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Bookmark className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{title ?? '—'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {item.job.company_name ? <span>{item.job.company_name}</span> : null}
                        {item.job.city ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.job.city}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
