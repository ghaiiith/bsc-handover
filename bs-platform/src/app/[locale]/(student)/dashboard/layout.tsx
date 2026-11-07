import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { NOINDEX_METADATA } from '@/lib/seo/metadata'
import DashboardShell from '@/components/dashboard/DashboardShell'

export const metadata: Metadata = NOINDEX_METADATA

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return <DashboardShell locale={locale}>{children}</DashboardShell>
}
