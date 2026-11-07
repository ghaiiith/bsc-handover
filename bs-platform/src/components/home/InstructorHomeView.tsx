import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { BookOpen, GraduationCap, Plus, Video } from 'lucide-react'
import RolePendingBanner from '@/components/home/RolePendingBanner'
import StudentHomeSections from '@/components/home/StudentHomeSections'
import { getDisplayName } from '@/lib/auth/profile'
import { getMyInstructorRequest } from '@/lib/instructor/submit-instructor-request'
import type { User } from '@/types'
import type { User as AuthUser } from '@supabase/supabase-js'

interface InstructorHomeViewProps {
  profile: User
  authUser: AuthUser
  locale: string
  userId: string
}

export default async function InstructorHomeView({
  profile,
  authUser,
  locale,
  userId,
}: InstructorHomeViewProps) {
  const t = await getTranslations('personalized_home')
  const isApproved = profile.role === 'instructor' || profile.role === 'admin'
  const request = isApproved ? null : await getMyInstructorRequest(userId)
  const displayName = getDisplayName(profile, authUser, locale as 'ar' | 'en')

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-foreground">
          {isApproved ? t('instructor_welcome') : t('welcome', { name: displayName })}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isApproved ? t('instructor_subtitle') : t('instructor_home_pending_subtitle')}
        </p>
      </section>

      {!isApproved ? (
        <RolePendingBanner
          title={t('instructor_pending_title')}
          description={
            request?.status === 'rejected'
              ? t('instructor_rejected_desc')
              : t('instructor_pending_desc')
          }
          ctaLabel={t('continue_application')}
          ctaHref={`/${locale}/dashboard/become-instructor`}
          steps={[
            t('instructor_step_profile'),
            t('instructor_step_review'),
            t('instructor_step_approval'),
          ]}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('instructor_workspace_title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={
              isApproved
                ? `/${locale}/instructor/courses/new`
                : `/${locale}/dashboard/become-instructor`
            }
            className="rounded-xl border border-border bg-card p-5 hover:border-[#E57D17]/40"
          >
            <Plus className="size-6 text-[#E57D17]" />
            <h3 className="mt-3 font-semibold">{t('create_course')}</h3>
            {!isApproved ? (
              <p className="mt-1 text-xs text-muted-foreground">{t('unlock_after_approval')}</p>
            ) : null}
          </Link>
          <Link
            href={isApproved ? `/${locale}/instructor` : `/${locale}/dashboard/become-instructor`}
            className="rounded-xl border border-border bg-card p-5 hover:border-[#045F6B]/40"
          >
            <Video className="size-6 text-[#045F6B]" />
            <h3 className="mt-3 font-semibold">{t('instructor_studio')}</h3>
            {!isApproved ? (
              <p className="mt-1 text-xs text-muted-foreground">{t('unlock_after_approval')}</p>
            ) : null}
          </Link>
          <Link
            href={
              isApproved
                ? `/${locale}/instructor/courses`
                : `/${locale}/dashboard/become-instructor`
            }
            className="rounded-xl border border-border bg-card p-5 hover:border-[#045F6B]/40"
          >
            <BookOpen className="size-6 text-[#045F6B]" />
            <h3 className="mt-3 font-semibold">{t('my_courses')}</h3>
          </Link>
          <Link
            href={`/${locale}/home`}
            className="rounded-xl border border-border bg-card p-5 hover:border-[#045F6B]/40"
          >
            <GraduationCap className="size-6 text-[#045F6B]" />
            <h3 className="mt-3 font-semibold">{t('instructor_dashboard')}</h3>
          </Link>
        </div>
      </section>

      {!isApproved ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('while_you_wait')}</h2>
          <StudentHomeSections userId={userId} locale={locale} />
        </section>
      ) : null}
    </div>
  )
}
