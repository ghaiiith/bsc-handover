import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getPersonalizedHomePath } from '@/lib/auth/personalized-home'
import { getSessionProfile } from '@/lib/auth/profile'
import { getUserProfile } from '@/lib/profile/get-user-profile'
import AccountSettingsForm from '@/components/account/AccountSettingsForm'

export default async function AccountSettingsPage() {
  const locale = await getLocale()
  const t = await getTranslations('account_settings')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const profile = await getUserProfile(session.authUser.id)
  if (!profile) redirect(getPersonalizedHomePath(locale))

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <AccountSettingsForm
        currentEmail={profile.email ?? session.authUser.email ?? ''}
        currentName={profile.full_name ?? ''}
      />
    </div>
  )
}
