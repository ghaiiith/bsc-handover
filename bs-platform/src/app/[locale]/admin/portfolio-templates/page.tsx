import { getLocale } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { listAllPortfolioTemplates } from '@/lib/portfolio/portfolio-templates'
import PortfolioTemplatesManager from '@/components/admin/PortfolioTemplatesManager'

export default async function AdminPortfolioTemplatesPage() {
  const locale = await getLocale()
  await requireAdminAccess(locale)

  const templates = await listAllPortfolioTemplates()

  return <PortfolioTemplatesManager locale={locale} templates={templates} />
}

export const metadata = { title: 'Portfolio Templates — Admin' }
