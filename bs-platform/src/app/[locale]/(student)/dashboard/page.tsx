import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import {
  Award,
  Bell,
  BookOpen,
  GraduationCap,
  Play,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { getDisplayName, getSessionProfile } from '@/lib/auth/profile'
import PageHeader from '@/components/dashboard/ux/PageHeader'
import QuickActions from '@/components/dashboard/ux/QuickActions'
import AttentionQueue from '@/components/dashboard/ux/AttentionQueue'
import ContinueLearningCard from '@/components/dashboard/ux/ContinueLearningCard'
import EmptyState from '@/components/dashboard/ux/EmptyState'
import { Progress } from '@/components/ui/progress'
import { formatCount } from '@/lib/format-number'
import { getStudentWorkflowData } from '@/lib/dashboard/get-student-workflow'
import DashboardClient from '@/components/dashboard/DashboardClient'
import RoleRequestPrompt from '@/components/onboarding/RoleRequestPrompt'
import {
  hasCompletedOnboarding,
  parsePreferences,
} from '@/lib/onboarding/preferences-utils'
import { createClient } from '@/lib/supabase/server'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'
import { getMyCompanyAffiliationRequest } from '@/lib/company/submit-company-request'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import {
  hasDeclinedRoleRequest,
  isPrivilegedAccountType,
} from '@/lib/onboarding/role-request-utils'
import type { OnboardingMeta } from '@/types/onboarding'

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('dashboard')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const { authUser, profile } = session
  const displayName = getDisplayName(profile, authUser, locale as 'ar' | 'en')
  // Report BS-58: these two are independent — run them CONCURRENTLY instead of
  // one after the other, halving this page's server time.
  const supabase = await createClient()
  const [workflow, userRowResult] = await Promise.all([
    getStudentWorkflowData(authUser.id, locale),
    supabase.from('users').select('preferences').eq('id', authUser.id).single(),
  ])
  const userRow = userRowResult.data

  const preferences = parsePreferences(userRow?.preferences)
  const hasPreferences = hasCompletedOnboarding(preferences)

  const resolved = await searchParams
  const promptParam = resolved.roleRequestPrompt === '1'
  const accountType = profile.account_type ?? 'student'
  const meta = (profile.onboarding_meta ?? {}) as OnboardingMeta

  let showRoleRequestPrompt = false
  if (
    promptParam &&
    isPrivilegedAccountType(accountType) &&
    !hasDeclinedRoleRequest(meta)
  ) {
    const hasPrivilegedRole =
      (accountType === 'instructor' && profile.role === 'instructor') ||
      (accountType === 'company' && profile.role === 'company') ||
      (accountType === 'freelancer' && profile.role === 'freelancer')

    if (!hasPrivilegedRole) {
      const [instructorReq, companyReq, freelancerReq] = await Promise.all([
        accountType === 'instructor' ? getMyInstructorRequest(authUser.id) : null,
        accountType === 'company' ? getMyCompanyAffiliationRequest(authUser.id) : null,
        accountType === 'freelancer' ? getMyFreelancerRequest(authUser.id) : null,
      ])
      const existingRequest =
        instructorReq ?? companyReq ?? freelancerReq
      showRoleRequestPrompt = !existingRequest
    }
  }

  const attentionItems = [
    ...(workflow.unreadNotifications > 0
      ? [
          {
            id: 'notifications',
            title: t('attention.unread_notifications'),
            subtitle: t('attention.unread_count', {
              count: workflow.unreadNotifications,
            }),
            href: `/${locale}/dashboard/notifications`,
            icon: Bell,
            priority: 'normal' as const,
            badge: String(workflow.unreadNotifications),
          },
        ]
      : []),
    ...(workflow.certificateCount > 0
      ? [
          {
            id: 'certificates',
            title: t('attention.certificates_ready'),
            subtitle: t('attention.certificate_count', {
              count: workflow.certificateCount,
            }),
            href: `/${locale}/dashboard/certificates`,
            icon: Award,
            priority: 'normal' as const,
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title={t('welcome', { name: displayName })}
        description={t('student_subtitle')}
      />

      {workflow.continueCourse ? (
        <ContinueLearningCard
          locale={locale}
          courseTitle={workflow.continueCourse.courseTitle}
          courseSlug={workflow.continueCourse.courseSlug}
          thumbnailUrl={workflow.continueCourse.thumbnailUrl}
          progressPercent={workflow.continueCourse.progressPercent}
          completedLessons={workflow.continueCourse.completedLessons}
          totalLessons={workflow.continueCourse.totalLessons}
          continueLessonSlug={workflow.continueCourse.continueLessonSlug}
          ctaLabel={t('continue_learning')}
          progressLabel={t('continue_label')}
        />
      ) : (
        <EmptyState
          icon={BookOpen}
          title={t('empty.no_courses_title')}
          description={t('empty.no_courses_desc')}
          action={{
            href: `/${locale}/courses`,
            label: t('empty.browse_courses'),
          }}
          className="mb-6"
        />
      )}

      <div className="mt-8 space-y-8">
        <QuickActions
          title={t('quick_actions')}
          actions={[
            {
              href: workflow.continueCourse?.continueLessonSlug
                ? `/${locale}/learn/${workflow.continueCourse.courseSlug}/${workflow.continueCourse.continueLessonSlug}`
                : `/${locale}/dashboard/my-learning`,
              label: t('actions.continue'),
              icon: Play,
              variant: 'default',
            },
            {
              href: `/${locale}/dashboard/certificates`,
              label: t('actions.certificates'),
              icon: Award,
            },
            {
              href: `/${locale}/dashboard/my-courses`,
              label: t('actions.my_courses'),
              icon: BookOpen,
            },
            {
              href: `/${locale}/dashboard/notifications`,
              label: t('actions.notifications'),
              icon: Bell,
            },
          ]}
        />

        {attentionItems.length > 0 && (
          <AttentionQueue
            title={t('needs_attention')}
            items={attentionItems}
            emptyTitle={t('all_caught_up')}
            emptyDescription={t('all_caught_up_desc')}
          />
        )}

        {workflow.recentCourses.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t('recent_courses')}
              </h2>
              <Link
                href={`/${locale}/dashboard/my-learning`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t('view_all')}
              </Link>
            </div>
            <ul className="divide-y rounded-xl border bg-card">
              {workflow.recentCourses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={course.href}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{course.title}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={course.progressPercent} className="h-1.5 flex-1" />
                        <span className="num-en shrink-0 text-xs text-muted-foreground">
                          {formatCount(course.progressPercent)}%
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile?.role === 'student' && (
          <DashboardClient
            locale={locale}
            hasPreferences={hasPreferences}
          />
        )}

        {profile?.role === 'student' && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{t('become_instructor_title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('become_instructor_desc')}
                  </p>
                </div>
              </div>
              <Link
                href={`/${locale}/dashboard/become-instructor`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t('become_instructor_cta')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {showRoleRequestPrompt && isPrivilegedAccountType(accountType) ? (
        <RoleRequestPrompt locale={locale} accountType={accountType} open />
      ) : null}
    </>
  )
}
