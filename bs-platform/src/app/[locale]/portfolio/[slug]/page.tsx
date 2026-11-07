import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import PortfolioPageContent from '@/components/portfolio/PortfolioPageContent'
import PortfolioTemplateRenderer from '@/components/portfolio/PortfolioTemplateRenderer'
import {
  buildPortfolioMetadata,
  loadPortfolioPage,
} from '@/lib/portfolio/get-portfolio-data'
import { getActivePortfolioTemplateHtml } from '@/lib/portfolio/portfolio-templates'
import { buildTemplateContext } from '@/lib/portfolio/template-context'
import { renderTemplate } from '@/lib/portfolio/template-engine'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/seo/metadata'

interface PortfolioPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  return buildPortfolioMetadata(slug, locale)
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { slug } = await params
  const locale = await getLocale()
  const data = await loadPortfolioPage(slug)

  const isAr = locale === 'ar'
  const displayName = isAr
    ? data.user.full_name_ar ?? data.user.full_name
    : data.user.full_name
  const portfolioUrl = `${getAppUrl()}/${locale}/portfolio/${slug}`

  // Report BS-35: an uploaded template replaces the built-in design when picked.
  const templateId = data.user.portfolio_template_id
  if (templateId) {
    const templateHtml = await getActivePortfolioTemplateHtml(templateId)
    if (templateHtml) {
      const filled = renderTemplate(
        templateHtml,
        buildTemplateContext(data, { locale, portfolioUrl })
      )
      return <PortfolioTemplateRenderer html={filled} />
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const ctaHref = user ? `/${locale}/dashboard/profile` : `/${locale}/register`

  return (
    <PortfolioPageContent
      locale={locale}
      data={data}
      portfolioUrl={portfolioUrl}
      displayName={displayName}
      ctaHref={ctaHref}
    />
  )
}
