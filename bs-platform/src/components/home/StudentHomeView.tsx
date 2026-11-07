import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import StudentHomeSections from '@/components/home/StudentHomeSections'
import { getDisplayName } from '@/lib/auth/profile'
import type { User } from '@/types'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { OnboardingAccountType } from '@/types/onboarding'
import { cn } from '@/lib/utils'

interface StudentHomeViewProps {
  profile: User
  authUser: AuthUser
  locale: string
  showRoleApplyBanner?: boolean
  accountType?: OnboardingAccountType
}

function roleApplyHref(locale: string, accountType: OnboardingAccountType): string {
  if (accountType === 'instructor') return `/${locale}/dashboard/become-instructor`
  if (accountType === 'company') return `/${locale}/dashboard/company-affiliation`
  return `/${locale}/dashboard/become-freelancer`
}

export default async function StudentHomeView({
  profile,
  authUser,
  locale,
  showRoleApplyBanner = false,
  accountType = 'student',
}: StudentHomeViewProps) {
  const t = await getTranslations('personalized_home')
  const displayName = getDisplayName(profile, authUser, locale as 'ar' | 'en')

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-foreground">
          {t('welcome', { name: displayName })}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('student_subtitle')}</p>
      </section>

      {showRoleApplyBanner && accountType !== 'student' ? (
        <div className="rounded-xl border border-[#E57D17]/30 bg-[#E57D17]/5 p-4">
          <p className="font-medium">{t('role_apply_banner_title', { role: t(`account_${accountType}`) })}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('role_apply_banner_desc')}</p>
          <Link
            href={roleApplyHref(locale, accountType)}
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              'mt-3 inline-flex bg-[#E57D17] hover:bg-[#CC6F14]'
            )}
          >
            {t('role_apply_banner_cta')}
          </Link>
        </div>
      ) : null}

      <StudentHomeSections userId={authUser.id} locale={locale} />
    </div>
  )
}
