import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import BrandLogo from '@/components/brand/BrandLogo'
import AccountSuspendedActions from '@/components/auth/AccountSuspendedActions'
import { NOINDEX_METADATA } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Account Suspended',
  ...NOINDEX_METADATA,
}

export default async function AccountSuspendedPage() {
  const locale = await getLocale()
  const t = await getTranslations('account_suspended')

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <BrandLogo mode="compact" iconSize={36} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <AccountSuspendedActions locale={locale} />
      </div>
    </div>
  )
}
