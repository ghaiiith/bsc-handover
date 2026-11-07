import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getPlatformSettings } from '@/lib/admin/platform-settings'
import MarketingSettingsForm from '@/components/admin/MarketingSettingsForm'

/** Marketing team request: every tracking id in one place, no code deploys. */
export default async function AdminMarketingPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)
  const t = await getTranslations('admin_marketing')
  const s = await getPlatformSettings()

  let copy: Record<string, string> = {}
  try {
    copy = JSON.parse(s.lead_popup_copy || '{}')
  } catch {
    /* empty */
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('page_title')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle')}</p>
      </div>
      <MarketingSettingsForm
        locale={locale}
        initial={{
          gtm_container_id: s.gtm_container_id,
          ga4_measurement_id: s.ga4_measurement_id,
          google_site_verification: s.google_site_verification,
          meta_pixel_id: s.meta_pixel_id,
          meta_domain_verification: s.meta_domain_verification,
          clarity_project_id: s.clarity_project_id,
          lead_popup_enabled: s.lead_popup_enabled === 'true',
          lead_popup_copy: copy,
          lead_notify_emails: s.lead_notify_emails,
        }}
        capiTokenSet={Boolean(s.meta_capi_access_token?.trim())}
      />
    </div>
  )
}

export const metadata = { title: 'Marketing — Admin' }
