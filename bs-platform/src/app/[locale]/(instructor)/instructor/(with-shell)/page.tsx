import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import {
  Award,
  BookOpen,
  MessageSquare,
  Plus,
  Tag,
  UserPlus,
  Wallet,
} from 'lucide-react'
import PageHeader from '@/components/dashboard/ux/PageHeader'
import QuickActions from '@/components/dashboard/ux/QuickActions'
import AttentionQueue from '@/components/dashboard/ux/AttentionQueue'
import EmptyState from '@/components/dashboard/ux/EmptyState'
import { formatPrice } from '@/lib/utils'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getInstructorWorkflowData } from '@/lib/instructor/get-instructor-workflow'

export default async function InstructorDashboardPage() {
  const locale = await getLocale()
  const t = await getTranslations('instructor')
  const td = await getTranslations('dashboard')
  const { profile, userId } = await requireInstructorAccess(locale)

  const displayName =
    locale === 'ar'
      ? profile.full_name_ar ?? profile.full_name
      : profile.full_name

  const workflow = await getInstructorWorkflowData(userId, locale)

  const attentionItems = workflow.attentionItems.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    href: item.href,
    icon:
      item.type === 'certificate_review'
        ? Award
        : item.type === 'enrollment'
          ? UserPlus
          : MessageSquare,
    priority: item.priority,
    timeLabel: item.timeLabel,
  }))

  return (
    <>
      <PageHeader
        title={t('welcome', { name: displayName })}
        description={t('workflow_subtitle')}
      />

      <AttentionQueue
        title={td('needs_attention')}
        items={attentionItems}
        emptyTitle={td('all_caught_up')}
        emptyDescription={td('instructor_caught_up')}
        emptyAction={
          !workflow.hasCourses
            ? {
                href: `/${locale}/instructor/courses/new`,
                label: t('create_first_course'),
              }
            : undefined
        }
        viewAllHref={`/${locale}/instructor/courses`}
        viewAllLabel={td('view_all')}
      />

      <div className="mt-8 space-y-8">
        <QuickActions
          title={td('quick_actions')}
          actions={[
            {
              href: `/${locale}/instructor/courses/new`,
              label: t('create_course_action'),
              icon: Plus,
              variant: 'default',
            },
            {
              href: `/${locale}/instructor/discounts`,
              label: t('manage_discounts'),
              icon: Tag,
            },
            {
              href: `/${locale}/instructor/earnings`,
              label: t('withdraw_action'),
              icon: Wallet,
            },
            {
              href: `/${locale}/dashboard/notifications`,
              label: td('actions.notifications'),
              icon: MessageSquare,
            },
          ]}
        />

        {workflow.hasCourses && (
          <section className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t('earnings_this_month')}</p>
            <p className="mt-1 text-2xl font-bold">{formatPrice(workflow.monthlyEarnings)}</p>
            <Link
              href={`/${locale}/instructor/earnings`}
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              {t('view_earnings')}
            </Link>
          </section>
        )}

        {!workflow.hasCourses && (
          <EmptyState
            icon={BookOpen}
            title={t('no_courses_title')}
            description={t('no_courses_desc')}
            action={{
              href: `/${locale}/instructor/courses/new`,
              label: t('create_first_course'),
            }}
          />
        )}
      </div>
    </>
  )
}
