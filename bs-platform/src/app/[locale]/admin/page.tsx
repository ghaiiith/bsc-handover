import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  BookOpen,
  Briefcase,
  DollarSign,
  GraduationCap,
  ShoppingBag,
  UserPlus,
} from 'lucide-react'
import PageHeader from '@/components/dashboard/ux/PageHeader'
import QuickActions from '@/components/dashboard/ux/QuickActions'
import AttentionQueue from '@/components/dashboard/ux/AttentionQueue'
import AdminRoleRequestsOverview from '@/components/admin/AdminRoleRequestsOverview'
import { formatPrice } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { getRoleRequestStats } from '@/lib/admin/get-role-requests'
import {
  getAdminOverviewStats,
  getAdminRecentActivity,
} from '@/lib/admin/get-admin-overview'
import type { ActivityItem } from '@/lib/admin/get-admin-overview'

const ACTIVITY_ICONS = {
  user_registered: UserPlus,
  enrollment: BookOpen,
  instructor_request: GraduationCap,
  course_submitted: BookOpen,
  job_posted: Briefcase,
  service_order: ShoppingBag,
}

interface AdminOverviewPageProps {
  params: Promise<{ locale: string }>
}

export default async function AdminOverviewPage({ params }: AdminOverviewPageProps) {
  const { locale } = await params
  const t = await getTranslations('admin')
  const td = await getTranslations('dashboard')
  const isAr = locale === 'ar'

  const [stats, activity, roleStats] = await Promise.all([
    getAdminOverviewStats(),
    getAdminRecentActivity(),
    getRoleRequestStats(),
  ])

  const attentionItems = [
    ...(stats.pendingRoleRequests > 0
      ? [
          {
            id: 'role-requests',
            title: t('pending_role_requests'),
            subtitle: t('pending_role_requests_count', { count: stats.pendingRoleRequests }),
            href: `/${locale}/admin/role-requests`,
            icon: GraduationCap,
            priority: 'high' as const,
            badge: String(stats.pendingRoleRequests),
          },
        ]
      : []),
    ...(stats.pendingCourses > 0
      ? [
          {
            id: 'pending-courses',
            title: t('pending_reviews'),
            subtitle: t('pending_courses_count', { count: stats.pendingCourses }),
            href: `/${locale}/admin/courses?status=pending`,
            icon: BookOpen,
            priority: 'high' as const,
            badge: String(stats.pendingCourses),
          },
        ]
      : []),
    ...(stats.pendingInstructorRequests > 0
      ? [
          {
            id: 'instructor-requests',
            title: t('instructor_requests'),
            subtitle: t('pending_requests_count', {
              count: stats.pendingInstructorRequests,
            }),
            href: `/${locale}/admin/role-requests?role=instructor`,
            icon: GraduationCap,
            priority: 'high' as const,
            badge: String(stats.pendingInstructorRequests),
          },
        ]
      : []),
    ...(stats.pendingCompanyRequests > 0
      ? [
          {
            id: 'company-requests',
            title: t('company_requests'),
            subtitle: t('pending_company_requests_count', {
              count: stats.pendingCompanyRequests,
            }),
            href: `/${locale}/admin/role-requests?role=company`,
            icon: Briefcase,
            priority: 'high' as const,
            badge: String(stats.pendingCompanyRequests),
          },
        ]
      : []),
    ...(stats.pendingFreelancerRequests > 0
      ? [
          {
            id: 'freelancer-requests',
            title: t('freelancer_requests'),
            subtitle: t('pending_freelancer_requests_count', {
              count: stats.pendingFreelancerRequests,
            }),
            href: `/${locale}/admin/role-requests?role=freelancer`,
            icon: ShoppingBag,
            priority: 'high' as const,
            badge: String(stats.pendingFreelancerRequests),
          },
        ]
      : []),
    ...(stats.pendingServiceOrders > 0
      ? [
          {
            id: 'service-orders',
            title: t('pending_service_orders'),
            subtitle: t('pending_orders_count', { count: stats.pendingServiceOrders }),
            href: `/${locale}/admin/services`,
            icon: ShoppingBag,
            priority: 'normal' as const,
            badge: String(stats.pendingServiceOrders),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={t('overview')}
        description={t('workflow_subtitle')}
      />

      <AdminRoleRequestsOverview locale={locale} stats={roleStats} />

      <AttentionQueue
        title={td('needs_attention')}
        items={attentionItems}
        emptyTitle={td('all_caught_up')}
        emptyDescription={t('all_caught_up_desc')}
        viewAllHref={`/${locale}/admin/role-requests`}
        viewAllLabel={t('manage_role_requests')}
      />

      <QuickActions
        title={td('quick_actions')}
        actions={[
          {
            href: `/${locale}/admin/role-requests`,
            label: t('review_requests_action'),
            icon: GraduationCap,
            variant: 'default',
          },
          {
            href: `/${locale}/admin/courses?status=pending`,
            label: t('review_courses_action'),
            icon: BookOpen,
          },
          {
            href: `/${locale}/admin/payments`,
            label: t('process_payments_action'),
            icon: DollarSign,
          },
          {
            href: `/${locale}/admin/broadcast`,
            label: t('send_broadcast_action'),
            icon: UserPlus,
          },
        ]}
      />

      <section className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t('revenue_overview')}</p>
        <p className="mt-1 text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
        <Link
          href={`/${locale}/admin/payments`}
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t('view_payments')}
        </Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('recent_activity')}
          </h2>
          <Link
            href={`/${locale}/admin/analytics`}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('view_analytics')}
          </Link>
        </div>
        <ul className="divide-y rounded-xl border bg-card">
          {activity.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('no_activity')}
            </li>
          ) : (
            activity.slice(0, 8).map((item: ActivityItem) => {
              const Icon = ACTIVITY_ICONS[item.type]
              return (
                <li key={item.id} className="flex gap-3 px-4 py-3 text-sm">
                  <div className="rounded-full bg-muted p-2 h-fit shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2">
                      {isAr ? item.textAr : item.textEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(item.createdAt, locale)}
                    </p>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </section>
    </div>
  )
}

export const metadata = { title: 'Admin Dashboard' }
