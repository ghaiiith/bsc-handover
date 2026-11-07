import { getLocale, getTranslations } from 'next-intl/server'
import BecomeFreelancerForm from '@/components/student/BecomeFreelancerForm'
import { getMyFreelancerRequest } from '@/lib/freelancer/submit-freelancer-request'
import { getSessionProfile } from '@/lib/auth/profile'
import { redirect } from 'next/navigation'
import { hasDeclinedRoleRequest } from '@/lib/onboarding/role-request-utils'
import type { OnboardingMeta } from '@/types/onboarding'

export default async function BecomeFreelancerPage() {
  const locale = await getLocale()
  const t = await getTranslations('become_freelancer')
  const session = await getSessionProfile()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  const { profile, authUser } = session
  if (profile.role === 'freelancer' || profile.role === 'admin') {
    redirect(`/${locale}/dashboard`)
  }

  const existingRequest = await getMyFreelancerRequest(authUser.id)
  const meta = (profile.onboarding_meta ?? {}) as OnboardingMeta
  const canSubmitFromOnboarding =
    profile.account_type === 'freelancer' &&
    !existingRequest &&
    !hasDeclinedRoleRequest(meta)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <BecomeFreelancerForm
        locale={locale}
        existingRequest={existingRequest}
        canSubmitFromOnboarding={canSubmitFromOnboarding}
      />
    </div>
  )
}
