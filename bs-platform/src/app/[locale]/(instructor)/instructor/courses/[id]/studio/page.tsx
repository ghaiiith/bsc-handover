import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import {
  BookOpen,
  ClipboardList,
  HelpCircle,
  Layers,
  Plus,
  Star,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioStatCard from '@/components/instructor/studio/StudioStatCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import {
  formatStudioRevenue,
  getCourseStudioContext,
  getStudioOverview,
} from '@/lib/instructor/studio/get-course-studio-data'
import { studioSectionPath } from '@/lib/instructor/studio/studio-paths'
import { formatCount } from '@/lib/format-number'
import { cn, formatDate } from '@/lib/utils'
import StarRating from '@/components/courses/StarRating'

interface StudioOverviewPageProps {
  params: Promise<{ id: string }>
}

export default async function StudioOverviewPage({ params }: StudioOverviewPageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.overview')
  const { userId } = await requireInstructorAccess(locale)

  const ctx = await getCourseStudioContext(id, userId)
  const data = await getStudioOverview(id, userId)
  if (!ctx || !data) return null

  const { course } = ctx
  const { metrics, recentEnrollments, recentReviews } = data
  const isAr = locale === 'ar'

  const quickActions = [
    {
      label: t('actions.add_lesson'),
      href: studioSectionPath(locale, id, 'curriculum'),
      icon: Plus,
    },
    {
      label: t('actions.upload_resource'),
      href: studioSectionPath(locale, id, 'resources'),
      icon: Upload,
    },
    {
      label: t('actions.create_quiz'),
      href: studioSectionPath(locale, id, 'quizzes'),
      icon: HelpCircle,
    },
    {
      label: t('actions.publish'),
      href: studioSectionPath(locale, id, 'settings'),
      icon: BookOpen,
    },
  ]

  return (
    <>
      <CourseStudioHeader
        locale={locale}
        course={course}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StudioStatCard
          label={t('stats.students')}
          value={formatCount(metrics.totalStudents)}
          icon={Users}
        />
        <StudioStatCard
          label={t('stats.revenue')}
          value={formatStudioRevenue(metrics.revenue)}
          icon={Wallet}
        />
        <StudioStatCard
          label={t('stats.completion')}
          value={`${formatCount(metrics.completionRate)}%`}
          icon={TrendingUp}
        />
        <StudioStatCard
          label={t('stats.rating')}
          value={metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : '—'}
          icon={Star}
        />
        <StudioStatCard
          label={t('stats.active')}
          value={formatCount(metrics.activeStudents)}
          icon={Layers}
        />
        <StudioStatCard
          label={t('stats.reviews')}
          value={formatCount(metrics.totalReviews)}
          icon={ClipboardList}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 edu-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{t('recent_enrollments')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('no_enrollments')}</p>
            ) : (
              recentEnrollments.map((row) => {
                const name = isAr
                  ? row.student.full_name_ar ?? row.student.full_name
                  : row.student.full_name
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={row.student.avatar_url ?? ''} />
                        <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground num-en">
                          {formatDate(row.enrolledAt, locale)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium num-en">
                      {formatStudioRevenue(row.amount)}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="edu-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{t('quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'justify-start gap-2 h-auto py-2.5'
                  )}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {action.label}
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 edu-card shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('recent_reviews')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_reviews')}</p>
          ) : (
            recentReviews.map((review) => {
              const name = isAr
                ? review.reviewer?.full_name_ar ?? review.reviewer?.full_name
                : review.reviewer?.full_name
              return (
                <div key={review.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{name ?? t('anonymous')}</p>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </>
  )
}
