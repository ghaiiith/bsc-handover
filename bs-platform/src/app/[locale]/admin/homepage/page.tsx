import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import HomepageBannerManager from '@/components/admin/HomepageBannerManager'
import GrowthGuideSettings from '@/components/admin/GrowthGuideSettings'
import { getPlatformSettings, parseHomepageBanners } from '@/lib/admin/platform-settings'

/**
 * Everything that controls what the public homepage shows, in one place — the
 * rotating banner images, the companies in the slider, and the growth-guide
 * landing page destinations. Previously buried at the bottom of Settings.
 */
export default async function AdminHomepagePage() {
  const locale = await getLocale()
  const t = await getTranslations('admin_homepage')
  await requireAdminAccess(locale)

  const settings = await getPlatformSettings()
  const banners = parseHomepageBanners(settings.homepage_banners)
  let companies: { name: string; name_ar?: string; logo_url?: string; link?: string }[] = []
  try {
    const raw = JSON.parse(settings.homepage_companies || '[]')
    if (Array.isArray(raw)) companies = raw
  } catch {
    /* keep empty */
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('page_title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('page_subtitle')}</p>
      </div>
      <HomepageBannerManager initialBanners={banners} initialCompanies={companies} />
      <GrowthGuideSettings
        initial={{
          pdfUrl: settings.growth_guide_pdf_url,
          bookingUrl: settings.growth_guide_booking_url,
          authorPhoto: settings.growth_guide_author_photo,
        }}
      />
    </div>
  )
}

export const metadata = { title: 'Homepage — Admin' }
